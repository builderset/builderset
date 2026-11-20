"""The editor's routes for the three builders, and the form's public ones.

Django REST Framework's APIView rather than plain views: it parses the JSON
body, answers in JSON, checks permissions per view, and throttles the public
responses route (429) with a setting. A plain Django view would do each by hand.
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from ipaddress import ip_address
from typing import Any

from builderset.form import validate_answers
from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, BasePermission, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .checks import EMAIL_TYPES, Kit, blocking_issues
from .models import Article, EmailTemplate, Form, FormResponse


def now_ms() -> datetime:
    """Now, to the millisecond, as JavaScript keeps time: the saved_at the
    editor sends back is then exactly the one stored."""
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


def iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="milliseconds") if value else None


def body_of(request: Request) -> dict[str, Any]:
    return request.data if isinstance(request.data, dict) else {}


# region kinds
# ── What differs between emails, articles and forms ────────────────────────


@dataclass(frozen=True)
class Kind:
    path: str
    kit: Kit
    model: type[EmailTemplate] | type[Article] | type[Form]
    noun: str
    #: The columns the list shows.
    listed: tuple[str, ...]
    #: Copies of the live document's meta, written with it, for lists and search.
    copies: Callable[[dict[str, Any]], dict[str, Any]]
    #: The columns a new row takes from the request; None when it lacks them.
    create: Callable[[dict[str, Any], dict[str, Any], Any], dict[str, Any] | None]
    #: Where unpublishing leaves it.
    unpublished: str
    #: Whether scheduled_at may put it live later.
    schedules: bool = False

    def permission(self, action: str) -> str:
        """Django's own: change_form, view_article, and the models' publish_*."""
        meta = self.model._meta
        return f"{meta.app_label}.{action}_{meta.model_name}"


def _new_email(body: dict[str, Any], _document: dict[str, Any], user: Any) -> dict[str, Any]:
    # Only a type the project has: its key picks the variables checked.
    type_key = body.get("type_key")
    known = isinstance(type_key, str) and type_key in EMAIL_TYPES
    return {"type_key": type_key if known else None, "created_by": user}


def _new_article(
    body: dict[str, Any], _document: dict[str, Any], user: Any
) -> dict[str, Any] | None:
    # The address is the article's, chosen when it is made.
    slug, locale = body.get("slug"), body.get("locale")
    if not isinstance(slug, str) or not isinstance(locale, str) or not slug or len(locale) > 10:
        return None
    return {"slug": slug[:200], "locale": locale, "author": user}


def _new_form(_body: dict[str, Any], document: dict[str, Any], user: Any) -> dict[str, Any]:
    # The slug is unique and required, and a new form often has none yet: a
    # placeholder holds its place until the form is published with its own.
    return {"slug": document["meta"]["slug"] or f"draft-{uuid.uuid4()}", "created_by": user}


def _article_copies(document: dict[str, Any]) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": cover.get("media", {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


KINDS = {
    kind.path: kind
    for kind in (
        Kind(
            path="emails",
            kit="email",
            model=EmailTemplate,
            noun="email template",
            listed=("id", "name", "type_key", "status", "saved_at", "published_at"),
            copies=lambda document: {"name": document["meta"]["name"]},
            create=_new_email,
            unpublished="draft",
        ),
        Kind(
            path="articles",
            kit="article",
            model=Article,
            noun="article",
            listed=("id", "slug", "locale", "title", "status", "saved_at", "published_at"),
            copies=_article_copies,
            create=_new_article,
            unpublished="draft",
            schedules=True,
        ),
        Kind(
            path="forms",
            kit="form",
            model=Form,
            noun="form",
            listed=("id", "slug", "name", "status", "response_count", "saved_at", "published_at"),
            copies=lambda document: {
                "name": document["meta"]["name"],
                "slug": document["meta"]["slug"],
            },
            create=_new_form,
            # A closed form keeps its link and shows its closed message.
            unpublished="closed",
        ),
    )
}


# endregion

# ── The editor's routes ─────────────────────────────────────────────────────


class MayEdit(BasePermission):
    """Who may edit is Django's permission system: change_emailtemplate, …"""

    def has_permission(self, request: Request, view: APIView) -> bool:
        return request.user.has_perm(view.kwargs["kind"].permission("change"))


def record(row: EmailTemplate | Article | Form) -> dict[str, Any]:
    """The record as the editor reads it."""
    return {
        "id": row.id,
        "status": row.status,
        "document": row.document,
        "draft_document": row.draft_document,
        "saved_at": iso(row.saved_at),
        "published_at": iso(row.published_at),
    }


def conflict(kind: Kind) -> Response:
    return Response({"message": f"Someone else saved this {kind.noun} since you opened it."}, 409)


def refused(issues: list[dict[str, Any]]) -> Response:
    # The editor shows each issue on the block it belongs to.
    return Response({"issues": issues}, 422)


def may_publish(request: Request, kind: Kind) -> None:
    # Publishing is its own permission: a draft and a live page are different trust.
    if not request.user.has_perm(kind.permission("publish")):
        raise PermissionDenied("You may not publish.")


class Documents(APIView):
    """GET /api/{kind}: the list. POST: a new document, as a draft."""

    permission_classes = [IsAuthenticated, MayEdit]

    def get(self, request: Request, kind: Kind) -> Response:
        rows = kind.model.objects.order_by("-saved_at").values(*kind.listed)[:200]
        return Response(list(rows))

    def post(self, request: Request, kind: Kind) -> Response:
        body = body_of(request)
        document = body.get("document")
        type_key = body.get("type_key") if isinstance(body.get("type_key"), str) else None
        if issues := blocking_issues(kind.kit, document, "draft", type_key=type_key):
            return refused(issues)
        columns = kind.create(body, document, request.user)
        if columns is None:
            return Response({"message": f"A new {kind.noun} needs a slug and a locale."}, 400)
        try:
            row = kind.model.objects.create(
                **{**kind.copies(document), **columns}, document=document, saved_at=now_ms()
            )
        except IntegrityError:
            return Response({"message": "That address is taken."}, 409)
        return Response(record(row), 201)


class Document(APIView):
    """GET /api/{kind}/{id}: what ``reload`` reads."""

    permission_classes = [IsAuthenticated, MayEdit]

    def get(self, request: Request, kind: Kind, pk: int) -> Response:
        return Response(record(get_object_or_404(kind.model, pk=pk)))


# region draft
class Draft(APIView):
    """PUT /api/{kind}/{id}/draft: an autosave or a manual save. Readers still get the live document."""

    permission_classes = [IsAuthenticated, MayEdit]

    def put(self, request: Request, kind: Kind, pk: int) -> Response:
        row = get_object_or_404(kind.model, pk=pk)
        body = body_of(request)
        # The editor sends back the saved_at it last saw. Another one here means
        # someone else saved in between; "keep mine" sends force.
        expected = parse_datetime(str(body.get("expected_saved_at") or ""))
        if body.get("force") is not True and expected and expected != row.saved_at:
            return conflict(kind)
        document = body.get("document")
        type_key = getattr(row, "type_key", None)
        if issues := blocking_issues(kind.kit, document, "draft", type_key=type_key):
            return refused(issues)
        saved_at = now_ms()
        # Written only if the row is still the one read above, so two saves at
        # the same moment cannot both win.
        written = kind.model.objects.filter(pk=row.pk, saved_at=row.saved_at).update(
            draft_document=document, saved_at=saved_at
        )
        return Response({"saved_at": iso(saved_at)}) if written else conflict(kind)


# endregion


# region publish
class Publish(APIView):
    """POST /api/{kind}/{id}/publish: the strict check, then the document goes live."""

    permission_classes = [IsAuthenticated, MayEdit]

    def post(self, request: Request, kind: Kind, pk: int) -> Response:
        may_publish(request, kind)
        row = get_object_or_404(kind.model, pk=pk)
        body = body_of(request)
        document = body.get("document")
        if issues := blocking_issues(
            kind.kit, document, "publish", type_key=getattr(row, "type_key", None)
        ):
            return refused(issues)
        now = now_ms()
        later = parse_datetime(str(body.get("scheduled_at") or "")) if kind.schedules else None
        if later and later <= now:
            later = None
        for column, value in kind.copies(document).items():
            setattr(row, column, value)
        row.document = document
        row.draft_document = None
        # A scheduled article waits for your job to set it live at scheduled_at.
        row.status = "scheduled" if later else "published"
        if isinstance(row, Article):
            row.scheduled_at = later
        row.published_at = None if later else now
        row.saved_at = now
        row.version = F("version") + 1
        try:
            with transaction.atomic():
                if isinstance(row, EmailTemplate) and row.type_key:
                    # One active design per email type: the one before steps down.
                    EmailTemplate.objects.filter(type_key=row.type_key, status="published").exclude(
                        pk=row.pk
                    ).update(status="draft", saved_at=now)
                row.save()
        except IntegrityError:
            # Another form already lives at this address.
            return refused([{"code": "meta.slugTaken", "path": "meta.slug"}])
        return Response(
            {
                "saved_at": iso(now),
                "status": row.status,
                "published_at": iso(row.published_at),
                "scheduled_at": iso(later),
            }
        )


# endregion


class Unpublish(APIView):
    """POST /api/{kind}/{id}/unpublish: readers no longer get it; the document is kept."""

    permission_classes = [IsAuthenticated, MayEdit]

    def post(self, request: Request, kind: Kind, pk: int) -> Response:
        may_publish(request, kind)
        row = get_object_or_404(kind.model, pk=pk)
        row.status = kind.unpublished
        row.saved_at = now_ms()
        row.save(update_fields=["status", "saved_at"])
        return Response({"saved_at": iso(row.saved_at), "status": row.status})


# region public
# ── The form's public routes ────────────────────────────────────────────────


def find_public(slug: str) -> Form:
    """The PUBLISHED form, never the draft: that is what the visitor saw."""
    return get_object_or_404(Form, slug=slug, status__in=["published", "closed"])


def instant(text: str) -> datetime:
    """A date from the form's settings (ISO); one without a zone is read as UTC."""
    value = datetime.fromisoformat(text)
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def is_closed(form: Form) -> bool:
    """Whether the form takes no responses now: closed by hand, full, or outside its dates."""
    limits = form.document["settings"]["limits"]
    now = datetime.now(UTC)
    opens, closes = limits["opensAt"], limits["closesAt"]
    return (
        form.status == "closed"
        or (limits["maxResponses"] is not None and form.response_count >= limits["maxResponses"])
        or (opens is not None and instant(opens) > now)
        or (closes is not None and instant(closes) <= now)
    )


def gone(form: Form) -> Response:
    """410, with the form's own closed message for the visitor."""
    return Response({"message": form.document["settings"]["limits"]["closedMessage"]}, 410)


def ip_of(request: Request) -> str | None:
    """The visitor's address. Behind a proxy, REMOTE_ADDR is the proxy's: set
    it from X-Forwarded-For in a middleware you trust."""
    try:
        return str(ip_address(request.META.get("REMOTE_ADDR", "")))
    except ValueError:
        return None


class PublicForm(APIView):
    """GET /api/public/forms/{slug}: the form, for the page that shows it."""

    # Visitors: no sign-in, so no session and no CSRF check.
    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def get(self, request: Request, slug: str) -> Response:
        form = find_public(slug)
        if is_closed(form):
            # The page still gets the document: <FormView closed> shows the
            # closed message in the form's own look.
            return Response({"closed": True, "document": form.document}, 410)
        return Response({"document": form.document})


class Responses(APIView):
    """POST /api/public/forms/{slug}/responses: ``{ answers, locale, trap }``
    from FormView's onSubmit."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]
    # REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["form_responses"], per address: 429 past it.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "form_responses"

    def post(self, request: Request, slug: str) -> Response:
        form = find_public(slug)
        if is_closed(form):
            return gone(form)
        body = body_of(request)
        # The hidden trap field is filled only by bots. They are told it worked
        # and nothing is stored, so they learn nothing to work around.
        if body.get("trap"):
            return Response({"id": None}, 201)

        answers = body.get("answers")
        result = validate_answers(form.document, answers if isinstance(answers, dict) else {})
        if not result.ok:
            return Response({"errors": result.as_dict()["errors"]}, 422)

        limits = form.document["settings"]["limits"]
        locale = body.get("locale")
        with transaction.atomic():
            # Counted and limited in one statement: two last responses at once
            # cannot both get in.
            room = Form.objects.filter(pk=form.pk, status="published")
            if limits["maxResponses"] is not None:
                room = room.filter(response_count__lt=limits["maxResponses"])
            if not room.update(response_count=F("response_count") + 1):
                return gone(form)
            response = FormResponse.objects.create(
                form=form,
                form_version=form.version,
                # Only the shown fields' answers, numbers as numbers: never the raw body.
                answers=result.values,
                locale=locale[:10] if isinstance(locale, str) else None,
                ip=ip_of(request) if form.document["settings"]["privacy"]["storeIp"] else None,
            )
        return Response({"id": response.id}, 201)


class ResponseList(APIView):
    """GET /api/forms/{id}/responses: for the editor's ``loadResponses``, and your inbox."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        if not request.user.has_perm(KINDS["forms"].permission("view")):
            raise PermissionDenied
        rows = FormResponse.objects.filter(form_id=pk)
        counts = rows.aggregate(
            total=Count("id"),
            this_week=Count("id", filter=Q(created_at__gt=datetime.now(UTC) - timedelta(days=7))),
        )
        latest = rows.order_by("-created_at")[:20]
        return Response(
            {
                **counts,
                "latest": [
                    {
                        "id": str(row.id),
                        "title": title_of(row.answers, row.id),
                        "when": iso(row.created_at),
                        "status": row.status,
                    }
                    for row in latest
                ],
            }
        )


def title_of(answers: dict[str, Any], response_id: int) -> str:
    """A line for the Responses tab: the first text answer."""
    first = next(
        (value for value in answers.values() if isinstance(value, str) and value.strip()), None
    )
    return first[:80] if first else f"Response {response_id}"


# endregion
