"""What differs between the five builders is a small table: the model, the
kit, the columns copied from the document, what publishing and unpublishing
also change. The views are written once, for whichever row of it the path
names."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from uuid import UUID

from django.utils import timezone

from .audit import Actor, record_activity, stamp
from .checks import EMAIL_TYPES, LOCALES
from .errors import Refused, find
from .models import (
    Action,
    Article,
    CardDesign,
    DocumentModel,
    EmailTemplate,
    Form,
    Kit,
    Popup,
    Status,
)
from .serializers import (
    ArticleSerializer,
    CardDesignSerializer,
    DocumentSerializer,
    EmailTemplateSerializer,
    FormSerializer,
    PopupSerializer,
)

Document = dict[str, Any]
#: Changes to the row, made with the write, in the same transaction.
Hook = Callable[[Any, Actor], None]


@dataclass(frozen=True)
class Kind:
    #: The path segment: /api/emails.
    path: str
    kit: Kit
    model: type[DocumentModel]
    serializer: type[DocumentSerializer]
    noun: str
    #: The column your list shows as each row's name, and ``q`` searches.
    name_column: str
    #: Copies of the live document, for lists, search and the site's queries.
    copies: Callable[[Document], dict[str, Any]]
    #: The columns a new row takes from the request body and the signed-in user.
    new_columns: Callable[[dict[str, Any], Actor], dict[str, Any]]
    on_publish: Hook | None = None
    on_unpublish: Hook | None = None
    #: Where unpublishing leaves it.
    unpublished: Status = Status.DRAFT
    #: Whether ``scheduled_at`` may put it live later.
    schedules: bool = False
    #: Whether ``published_at`` stays the first publish: an article's list sorts by it.
    keeps_first_publish: bool = False

    def find(self, id: UUID, *, deleted: bool = False, lock: bool = False) -> Any:
        """The row the path names: live, or for restore, deleted."""
        rows = self.model.objects.deleted() if deleted else self.model.objects.live()
        return find(rows.select_for_update() if lock else rows, self.noun, uuid=id)


def _root_props(document: Document) -> dict[str, Any]:
    """A card or a popup keeps its own settings on the root node."""
    props: dict[str, Any] = document["nodes"][document["root"]]["props"]
    return props


def _from_document(_body: dict[str, Any], _actor: Actor) -> dict[str, Any]:
    # Everything a new card design or popup has is in its document.
    return {}


# ── Emails ──────────────────────────────────────────────────────────────────


def _email_columns(body: dict[str, Any], _actor: Actor) -> dict[str, Any]:
    # Only a type the project has: its key picks the variables checked.
    type_key = body.get("type_key")
    return {"type_key": type_key if type_key in EMAIL_TYPES else None}


def _step_down_active(row: EmailTemplate, actor: Actor) -> None:
    """One active design per email type: the one before goes back to draft."""
    if not row.type_key:
        return
    before = (
        EmailTemplate.objects.live()
        .select_for_update()
        .filter(type_key=row.type_key, status=Status.PUBLISHED)
        .exclude(pk=row.pk)
    )
    for previous in before:
        previous.status = Status.DRAFT
        stamp(previous, actor)
        previous.save(update_fields=["status", "updated_by", "updated_at"])
        record_activity(
            previous,
            Action.UNPUBLISHED,
            actor,
            from_status=Status.PUBLISHED,
            to_status=Status.DRAFT,
            details={"replaced_by": str(row.uuid)},
        )


# ── Articles ────────────────────────────────────────────────────────────────


def _article_columns(body: dict[str, Any], actor: Actor) -> dict[str, Any]:
    # The address is the article's, chosen when it is made.
    slug, locale = body.get("slug"), body.get("locale")
    if not isinstance(slug, str) or not slug.strip():
        raise Refused(issues=[{"code": "meta.slugMissing", "path": "slug"}])
    if locale not in LOCALES:
        raise Refused(issues=[{"code": "i18n.locale.unknown", "path": "locale"}])
    return {"slug": slug.strip()[:200], "locale": locale, "author": actor}


def _article_copies(document: Document) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": (cover.get("media") or {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


def _unschedule(row: Article, _actor: Actor) -> None:
    row.scheduled_at = None


# ── Forms ───────────────────────────────────────────────────────────────────


def _form_columns(_body: dict[str, Any], _actor: Actor) -> dict[str, Any]:
    # A new form has no address yet: it holds draft-<uuid>, unique like the
    # uuid, until publishing copies document.meta.slug.
    public_id = uuid.uuid4()
    return {"uuid": public_id, "slug": f"draft-{public_id}"}


def _reopen(row: Form, _actor: Actor) -> None:
    row.closed_at = None
    row.closed_by = None


def _close(row: Form, actor: Actor) -> None:
    row.closed_at = timezone.now()
    row.closed_by = actor


# ── Cards ───────────────────────────────────────────────────────────────────


def _card_copies(document: Document) -> dict[str, Any]:
    card = _root_props(document)
    return {
        "name": document["meta"]["name"],
        "format": card["format"],
        "width_mm": card["width"],
        "height_mm": card["height"],
        "sides": card["sides"],
    }


# ── Popups ──────────────────────────────────────────────────────────────────


def _midnight(day: str) -> datetime | None:
    """The start of a YYYY-MM-DD day in UTC, or None when there is none."""
    try:
        return datetime.combine(date.fromisoformat(day), time(), tzinfo=UTC) if day else None
    except ValueError:  # well formed, but no such day: 2026-02-30
        return None


def _popup_copies(document: Document) -> dict[str, Any]:
    popup = _root_props(document)
    display = popup["display"]
    # The display rules keep whole days in the visitor's own time zone. A day
    # begins and ends at different instants around the world, so the columns
    # hold the widest window: from where the first day begins (UTC+14) to
    # where the last day ends (UTC-12). shouldShow decides by the visitor's day.
    first, last = _midnight(display["starts"]), _midnight(display["ends"])
    starts_at = first - timedelta(hours=14) if first else None
    ends_at = last + timedelta(days=1, hours=12) if last else None
    # A draft may still end before it starts (display.datesInvalid): no window yet.
    if starts_at and ends_at and ends_at <= starts_at:
        starts_at = ends_at = None
    return {
        "name": document["meta"]["name"],
        "type": popup["type"],
        "starts_at": starts_at,
        "ends_at": ends_at,
        "priority": display["priority"],
    }


KINDS: dict[str, Kind] = {
    kind.path: kind
    for kind in (
        Kind(
            path="emails",
            kit=Kit.EMAIL,
            model=EmailTemplate,
            serializer=EmailTemplateSerializer,
            noun="email template",
            name_column="name",
            copies=lambda document: {"name": document["meta"]["name"]},
            new_columns=_email_columns,
            on_publish=_step_down_active,
        ),
        Kind(
            path="articles",
            kit=Kit.ARTICLE,
            model=Article,
            serializer=ArticleSerializer,
            noun="article",
            name_column="title",
            copies=_article_copies,
            new_columns=_article_columns,
            on_publish=_unschedule,
            on_unpublish=_unschedule,
            schedules=True,
            keeps_first_publish=True,
        ),
        Kind(
            path="forms",
            kit=Kit.FORM,
            model=Form,
            serializer=FormSerializer,
            noun="form",
            name_column="name",
            copies=lambda document: {
                "name": document["meta"]["name"],
                "slug": document["meta"]["slug"],
            },
            new_columns=_form_columns,
            on_publish=_reopen,
            on_unpublish=_close,
            # A closed form keeps its link and shows its closed message.
            unpublished=Status.CLOSED,
        ),
        Kind(
            path="cards",
            kit=Kit.CARD,
            model=CardDesign,
            serializer=CardDesignSerializer,
            noun="card design",
            name_column="name",
            copies=_card_copies,
            new_columns=_from_document,
        ),
        Kind(
            path="popups",
            kit=Kit.POPUP,
            model=Popup,
            serializer=PopupSerializer,
            noun="popup",
            name_column="name",
            copies=_popup_copies,
            new_columns=_from_document,
        ),
    )
}
