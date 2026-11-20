"""A popup's public routes, which your site and PopupView call without a
sign-in, and pausing, which takes a popup off the site and puts it back."""

from typing import Any
from uuid import UUID

from builderset.popup import language_matches, path_matches, validate_submission
from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Now
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..audit import actor_of, record_activity, stamp
from ..errors import Conflict, Gone, Refused, find
from ..models import (
    Action,
    Popup,
    PopupDailyStat,
    PopupEvent,
    PopupSubmission,
    Status,
)
from ..permissions import StaffView
from ..serializers import PublicPopupSerializer
from .common import body_of
from .forms import VisitorSession, ip_of

#: A submission keeps the visitor's address only if your privacy rules allow it.
STORE_IP = False

# region public
# ── The public routes ────────────────────────────────────────────────────────


def on_site() -> Q:
    """Showing now, as far as the server can tell: published, and within its dates."""
    return (
        Q(status=Status.PUBLISHED)
        & (Q(starts_at__isnull=True) | Q(starts_at__lte=Now()))
        & (Q(ends_at__isnull=True) | Q(ends_at__gt=Now()))
    )


def fits_page(document: dict[str, Any], path: str | None, locale: str | None) -> bool:
    """The display rules the server applies: the pages and the language, with
    the kit's own matching. shouldShow checks them again in the browser, with
    the rest."""
    display = document["nodes"][document["root"]]["props"]["display"]
    if path is not None and display["pages"] != "all":
        listed = any(rule.strip() and path_matches(rule, path) for rule in display["rules"])
        if listed != (display["pages"] == "only"):
            return False
    return language_matches(display["language"], locale)


def find_public(id: UUID) -> Popup:
    """A popup that is on the site or paused: a draft has never been seen."""
    popups = Popup.objects.live().filter(status__in=[Status.PUBLISHED, Status.PAUSED])
    return find(popups, "popup", uuid=id)


class PublicPopups(APIView):
    """GET /api/public/popups?path=&locale=: the popups that may show on this
    page, highest priority first. shouldShow decides the rest in the browser:
    the audience, how often, the device."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        path, locale = request.query_params.get("path"), request.query_params.get("locale")
        live = Popup.objects.live().filter(on_site()).order_by("-priority", "id")
        popups = [popup for popup in live if fits_page(popup.document, path, locale)]
        return Response(PublicPopupSerializer(popups, many=True).data)


class PopupEvents(APIView):
    """POST /api/public/popups/:id/events: ``{ event }`` from PopupView's
    onEvent, added to today's counters."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def post(self, request: Request, id: UUID) -> Response:
        event = body_of(request).get("event")
        if event not in PopupEvent.values:
            raise Refused(issues=[{"code": "event.unknown", "path": "event"}])
        PopupDailyStat.objects.add_one(find_public(id), PopupEvent(event))
        return Response(status=204)


class PopupSubmissions(APIView):
    """POST /api/public/popups/:id/submissions: ``{ values, path, locale }``
    from PopupView's onSubmit."""

    authentication_classes = [VisitorSession]
    permission_classes = [AllowAny]
    # REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["popup_submissions"], per address: 429 past it.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "popup_submissions"

    def post(self, request: Request, id: UUID) -> Response:
        popup = find_public(id)
        if not Popup.objects.filter(on_site(), pk=popup.pk).exists():
            raise Gone(message="This popup is no longer on the site.")
        body = body_of(request)
        # Checked against the live popup: only its own inputs' answers, trimmed.
        result = validate_submission(popup.document, body.get("values"))
        if not result.ok:
            raise Refused(errors=result.as_dict()["errors"])
        path, locale = body.get("path"), body.get("locale")
        submission = PopupSubmission(
            popup=popup,
            popup_version=popup.version,
            answers=result.values,
            page_path=path[:500] if isinstance(path, str) else None,
            locale=locale[:10] if isinstance(locale, str) else None,
            ip=ip_of(request) if STORE_IP else None,
        )
        actor = actor_of(request)
        stamp(submission, actor)
        with transaction.atomic():
            submission.save()
            record_activity(
                submission,
                Action.CREATED,
                actor,
                to_status=submission.status,
                details={"popup": str(popup.uuid)},
            )
        return Response({"id": str(submission.uuid)}, status=201)


# endregion

# ── Your team ────────────────────────────────────────────────────────────────


class PausePopup(StaffView):
    """PATCH /api/popups/:id/pause: ``{ paused }``. Off the site, or back on.
    Only the status changes: the document and saved_at stay as they are."""

    model = Popup
    actions = {"PATCH": "publish"}

    @transaction.atomic
    def patch(self, request: Request, id: UUID) -> Response:
        paused = body_of(request).get("paused")
        if not isinstance(paused, bool):
            raise Refused(issues=[{"code": "paused.invalid", "path": "paused"}])
        popup = find(Popup.objects.live().select_for_update(), "popup", uuid=id)
        if popup.status == Status.DRAFT:
            raise Conflict(message="This popup has never been published: publish it first.")
        wanted = Status.PAUSED if paused else Status.PUBLISHED
        if popup.status != wanted:
            actor, before = actor_of(request), popup.status
            popup.status = wanted
            stamp(popup, actor)
            popup.save(update_fields=["status", "updated_by", "updated_at"])
            action = Action.PAUSED if paused else Action.PUBLISHED
            record_activity(popup, action, actor, from_status=before, to_status=wanted)
        return Response({"status": popup.status})
