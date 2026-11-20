"""What differs between the five builders, in one table. The routes are
written once and look their kind up here by the URL: /api/{kind}/…"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated, Any, Literal

from fastapi import Depends

from app.errors import NotFoundError
from app.models import (
    SECTION_KITS,
    Article,
    ArticleRevision,
    CardDesign,
    CardDesignRevision,
    EmailTemplate,
    EmailTemplateRevision,
    Form,
    FormRevision,
    Kit,
    Popup,
    PopupRevision,
    Status,
)

DocumentRow = EmailTemplate | Article | Form | CardDesign | Popup
RevisionRow = (
    EmailTemplateRevision | ArticleRevision | FormRevision | CardDesignRevision | PopupRevision
)


@dataclass(frozen=True)
class Kind:
    kit: Kit
    noun: str
    model: type[DocumentRow]
    revision: type[RevisionRow]
    #: Copies of the live document written with it, for lists, search and the
    #: site's queries: the site never reads inside the JSON for them.
    copies: Callable[[dict[str, Any]], dict[str, Any]]
    #: Where unpublishing leaves it.
    unpublished: Status = Status.DRAFT
    #: Whether ``scheduled_at`` may put it live later.
    schedules: bool = False


def _root_props(document: dict[str, Any]) -> dict[str, Any]:
    """A card or a popup keeps its own settings on the root node."""
    props: dict[str, Any] = document["nodes"][document["root"]]["props"]
    return props


def _email_copies(document: dict[str, Any]) -> dict[str, Any]:
    return {"name": document["meta"]["name"]}


def _article_copies(document: dict[str, Any]) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": cover.get("media", {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


def _form_copies(document: dict[str, Any]) -> dict[str, Any]:
    # Publishing is when a form takes its real address.
    return {"name": document["meta"]["name"], "slug": document["meta"]["slug"]}


def _card_copies(document: dict[str, Any]) -> dict[str, Any]:
    card = _root_props(document)
    return {
        "name": document["meta"]["name"],
        "format": card["format"],
        "width_mm": card["width"],
        "height_mm": card["height"],
        "sides": card["sides"],
    }


def _midnight(day: str) -> datetime | None:
    """The start of a YYYY-MM-DD day in UTC, or None when there is none."""
    try:
        return datetime.combine(date.fromisoformat(day), time(), tzinfo=UTC) if day else None
    except ValueError:  # well formed, but no such day: 2026-02-30
        return None


def _popup_copies(document: dict[str, Any]) -> dict[str, Any]:
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
    "emails": Kind(
        kit=Kit.EMAIL,
        noun="email template",
        model=EmailTemplate,
        revision=EmailTemplateRevision,
        copies=_email_copies,
    ),
    "articles": Kind(
        kit=Kit.ARTICLE,
        noun="article",
        model=Article,
        revision=ArticleRevision,
        copies=_article_copies,
        schedules=True,
    ),
    "forms": Kind(
        kit=Kit.FORM,
        noun="form",
        model=Form,
        revision=FormRevision,
        copies=_form_copies,
        # A closed form keeps its link and shows its closed message.
        unpublished=Status.CLOSED,
    ),
    "cards": Kind(
        kit=Kit.CARD,
        noun="card design",
        model=CardDesign,
        revision=CardDesignRevision,
        copies=_card_copies,
    ),
    "popups": Kind(
        kit=Kit.POPUP,
        noun="popup",
        model=Popup,
        revision=PopupRevision,
        copies=_popup_copies,
    ),
}


def kind_of(kind: Literal["emails", "articles", "forms", "cards", "popups"]) -> Kind:
    return KINDS[kind]


#: The kind named by the URL's ``{kind}``; any other answers 422.
DocumentKind = Annotated[Kind, Depends(kind_of)]


def library_of(kind: DocumentKind) -> Kind:
    """A kind whose editor keeps saved sections. Cards and popups keep none: 404."""
    if kind.kit not in SECTION_KITS:
        raise NotFoundError(f"A {kind.noun} has no saved sections.")
    return kind


#: The kind named by ``/api/{kind}/sections``.
LibraryKind = Annotated[Kind, Depends(library_of)]
