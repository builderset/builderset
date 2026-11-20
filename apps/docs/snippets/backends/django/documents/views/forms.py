"""A form's public routes, which visitors use, and its responses, which your team reads."""

from datetime import UTC, datetime, timedelta
from ipaddress import ip_address
from typing import Any
from uuid import UUID

from builderset.form import validate_answers
from django.db import transaction
from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..audit import actor_of, record_activity, soft_delete, stamp
from ..errors import Gone, Refused, find
from ..models import Action, Form, FormResponse, Status
from ..permissions import StaffView
from ..serializers import ResponseSerializer
from .common import body_of

# region public
# ── The public routes ────────────────────────────────────────────────────────


def find_public(slug: str) -> Form:
    """The PUBLISHED form, never the draft: that is what the visitor saw."""
    published = Form.objects.live().filter(status__in=[Status.PUBLISHED, Status.CLOSED])
    return find(published, "form", slug=slug)


def _instant(text: str) -> datetime:
    """A date from the form's settings (ISO); one without a zone is read as UTC."""
    value = datetime.fromisoformat(text)
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def is_closed(form: Form) -> bool:
    """Whether the form takes no responses now: closed by hand, full, or outside its dates."""
    limits = form.document["settings"]["limits"]
    now = timezone.now()
    opens, closes, most = limits["opensAt"], limits["closesAt"], limits["maxResponses"]
    return (
        form.status == Status.CLOSED
        or (most is not None and form.response_count >= most)
        or (opens is not None and _instant(opens) > now)
        or (closes is not None and _instant(closes) <= now)
    )


def closed(form: Form) -> Gone:
    """410, with the form's own closed message for the visitor."""
    return Gone(message=form.document["settings"]["limits"]["closedMessage"])


def ip_of(request: Request) -> str | None:
    """The visitor's address. Behind a proxy, REMOTE_ADDR is the proxy's: set
    it from X-Forwarded-For in a middleware you trust."""
    try:
        return str(ip_address(request.META.get("REMOTE_ADDR", "")))
    except ValueError:
        return None


class VisitorSession(SessionAuthentication):
    """Who the visitor is, when signed in, to name them on their response. No
    CSRF check: anyone may send a response, and Django's SameSite=Lax session
    cookie is not sent with another site's POST, so no site can send one as them."""

    def enforce_csrf(self, request: Any) -> None:
        return None


class PublicForm(APIView):
    """GET /api/public/forms/:slug: the form, for the page that shows it."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        form = find_public(slug)
        if is_closed(form):
            # The page still gets the document: <FormView closed> shows the
            # closed message in the form's own look.
            return Response({"closed": True, "document": form.document}, status=410)
        return Response({"document": form.document})


class PublicResponses(APIView):
    """POST /api/public/forms/:slug/responses: ``{ answers, locale, trap }``
    from FormView's onSubmit."""

    authentication_classes = [VisitorSession]
    permission_classes = [AllowAny]
    # REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["form_responses"], per address: 429 past it.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "form_responses"

    def post(self, request: Request, slug: str) -> Response:
        form = find_public(slug)
        if is_closed(form):
            raise closed(form)
        body = body_of(request)
        # The hidden trap field is filled only by bots. They are told it worked
        # and nothing is stored, so they learn nothing to work around.
        if body.get("trap"):
            return Response({"id": None}, status=201)

        result = validate_answers(form.document, body.get("answers"))
        if not result.ok:
            raise Refused(errors=result.as_dict()["errors"])
        response = FormResponse(
            form=form,
            form_version=form.version,
            # Only the shown fields' answers, numbers as numbers: never the raw body.
            answers=result.values,
            locale=body["locale"][:10] if isinstance(body.get("locale"), str) else None,
            ip=ip_of(request) if form.document["settings"]["privacy"]["storeIp"] else None,
        )
        stamp(response, actor_of(request))
        with transaction.atomic():
            # Counted and limited in one statement: two last responses at once
            # cannot both get in.
            room = Form.objects.live().filter(pk=form.pk, status=Status.PUBLISHED)
            most = form.document["settings"]["limits"]["maxResponses"]
            if most is not None:
                room = room.filter(response_count__lt=most)
            if not room.update(response_count=F("response_count") + 1):
                raise closed(form)
            response.save()
        return Response({"id": str(response.uuid)}, status=201)


# endregion

# ── Your team's inbox ────────────────────────────────────────────────────────


def title_of(response: FormResponse) -> str:
    """A line for the Responses tab: the first text answer."""
    first = next(
        (value for value in response.answers.values() if isinstance(value, str) and value.strip()),
        None,
    )
    return first[:80] if first else f"Response of {response.created_at:%Y-%m-%d %H:%M}"


class ResponseSummary(StaffView):
    """GET /api/forms/:id/responses: the editor's ``loadResponses``."""

    model = FormResponse

    def get(self, request: Request, id: UUID) -> Response:
        form = find(Form.objects.live(), "form", uuid=id)
        responses = form.responses.live()
        week_ago = timezone.now() - timedelta(days=7)
        counts = responses.aggregate(
            total=Count("id"), this_week=Count("id", filter=Q(created_at__gte=week_ago))
        )
        latest = [
            {
                "id": str(response.uuid),
                "title": title_of(response),
                "when": response.created_at.isoformat(),
                "status": response.status,
            }
            for response in responses.order_by("-created_at")[:20]
        ]
        return Response({**counts, "latest": latest})


class ResponseDetail(StaffView):
    """PATCH /api/forms/:id/responses/:rid: ``{ status, note }``, your triage.
    DELETE: to the trash. The retention job deletes for good; this never does."""

    model = FormResponse

    def find_response(self, form_id: UUID, response_id: UUID) -> FormResponse:
        responses = FormResponse.objects.live().select_for_update()
        return find(
            responses.filter(form__uuid=form_id, form__deleted_at__isnull=True),
            "response",
            uuid=response_id,
        )

    @transaction.atomic
    def patch(self, request: Request, id: UUID, response_id: UUID) -> Response:
        actor = actor_of(request)
        response = self.find_response(id, response_id)
        before = response.status
        triage = ResponseSerializer(response, data=request.data, partial=True)
        triage.is_valid(raise_exception=True)
        triage.save(updated_by=actor)
        if response.status != before:
            record_activity(
                response,
                Action.STATUS_CHANGED,
                actor,
                from_status=before,
                to_status=response.status,
            )
        return Response(triage.data)

    @transaction.atomic
    def delete(self, request: Request, id: UUID, response_id: UUID) -> Response:
        soft_delete(self.find_response(id, response_id), actor_of(request))
        return Response(status=204)
