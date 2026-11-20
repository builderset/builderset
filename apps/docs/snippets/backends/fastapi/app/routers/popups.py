"""A popup's two audiences: your site and PopupView, which ask for popups and
report what visitors did without signing in, and your team, who pause one."""

from typing import Any
from uuid import UUID

from builderset.popup import language_matches, path_matches, validate_submission
from fastapi import APIRouter, Depends, Request
from sqlalchemy import ColumnElement, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.audit import find, record_activity, stamp
from app.deps import CurrentUser, SessionDep, Visitor, current_user
from app.errors import ConflictError, GoneError, InvalidInputError, NotFoundError
from app.models import (
    NEW_RESPONSE,
    Action,
    Popup,
    PopupDailyStat,
    PopupEvent,
    PopupSubmission,
    Status,
)
from app.routers.forms import ip_of
from app.schemas import Pause, PopupEventIn, PopupStatus, PopupValues, PublicPopup, Received

#: A submission keeps the visitor's address only if your privacy rules allow it.
STORE_IP = False

# ── Visitors ────────────────────────────────────────────────────────────────

public = APIRouter(prefix="/api/public/popups")


def _on_site() -> list[ColumnElement[bool]]:
    """Showing now, as far as the server can tell: published, and within its dates."""
    return [
        Popup.status == Status.PUBLISHED,
        or_(Popup.starts_at.is_(None), Popup.starts_at <= func.now()),
        or_(Popup.ends_at.is_(None), Popup.ends_at > func.now()),
    ]


def _fits_page(document: dict[str, Any], path: str | None, locale: str | None) -> bool:
    """The display rules the server applies: the pages and the language, with
    the kit's own matching. shouldShow checks them again in the browser, with
    the rest."""
    display = document["nodes"][document["root"]]["props"]["display"]
    if path is not None and display["pages"] != "all":
        listed = any(rule.strip() and path_matches(rule, path) for rule in display["rules"])
        if listed != (display["pages"] == "only"):
            return False
    return language_matches(display["language"], locale)


def _find_public(db: Session, popup_id: UUID) -> Popup:
    """A popup that is on the site or paused: a draft has never been seen."""
    popup = db.scalar(
        select(Popup).where(
            Popup.uuid == popup_id,
            Popup.live(),
            Popup.status.in_((Status.PUBLISHED, Status.PAUSED)),
        )
    )
    if popup is None:
        raise NotFoundError("There is no such popup.")
    return popup


@public.get("")
def list_popups(
    db: SessionDep, path: str | None = None, locale: str | None = None
) -> list[PublicPopup]:
    """The popups that may show on this page, highest priority first. shouldShow
    decides the rest in the browser: the audience, how often, the device."""
    live = db.scalars(
        select(Popup).where(Popup.live(), *_on_site()).order_by(Popup.priority.desc(), Popup.id)
    )
    return [
        PublicPopup.model_validate(popup)
        for popup in live
        if _fits_page(popup.document, path, locale)
    ]


@public.post("/{popup_id}/events", status_code=204)
def count_event(popup_id: UUID, body: PopupEventIn, db: SessionDep) -> None:
    """PopupView's ``onEvent``: one more for today's counter. One statement, so
    two visitors at the same moment both count."""
    popup = _find_public(db, popup_id)
    # Each counter's name is the event's, from the enum: never from the request.
    ones = {event.value: int(event == body.event) for event in PopupEvent}
    today = insert(PopupDailyStat).values(popup_id=popup.id, day=func.current_date(), **ones)
    db.execute(
        today.on_conflict_do_update(
            index_elements=[PopupDailyStat.popup_id, PopupDailyStat.day],
            set_={name: getattr(PopupDailyStat, name) + today.excluded[name] for name in ones},
        )
    )
    db.commit()


@public.post("/{popup_id}/submissions", status_code=201)
def submit(
    popup_id: UUID, body: PopupValues, request: Request, db: SessionDep, visitor: Visitor
) -> Received:
    """PopupView's ``onSubmit``. Put a rate limit in front of it (your proxy,
    or slowapi), answering 429."""
    popup = _find_public(db, popup_id)
    if db.scalar(select(Popup.id).where(Popup.id == popup.id, *_on_site())) is None:
        raise GoneError("This popup is no longer on the site.")
    # Checked against the live popup: only its own inputs' answers, trimmed.
    result = validate_submission(popup.document, body.values)
    if not result.ok:
        raise InvalidInputError(
            "Some answers need another look.", errors=result.as_dict()["errors"]
        )
    submission = PopupSubmission(
        popup_id=popup.id,
        popup_version=popup.version,
        answers=result.values,
        page_path=body.path,
        locale=body.locale,
        status=NEW_RESPONSE,
        ip=ip_of(request) if STORE_IP else None,
        created_by=visitor,
    )
    db.add(submission)
    record_activity(
        db,
        submission,
        Action.CREATED,
        visitor,
        to_status=NEW_RESPONSE,
        details={"popup": str(popup.uuid)},
    )
    db.commit()
    return Received(id=submission.uuid)


# ── Your team ───────────────────────────────────────────────────────────────

team = APIRouter(prefix="/api/popups", dependencies=[Depends(current_user)])


@team.patch("/{popup_id}/pause")
def pause(popup_id: UUID, body: Pause, db: SessionDep, user: CurrentUser) -> PopupStatus:
    """Off the site, or back on. Only the status changes: the document and
    saved_at stay as they are. Pausing is publishing's permission."""
    popup = find(db, Popup, popup_id, lock=True)
    if popup.status == Status.DRAFT:
        raise ConflictError("This popup has never been published: publish it first.")
    wanted = Status.PAUSED if body.paused else Status.PUBLISHED
    if popup.status != wanted:
        before = popup.status
        popup.status = wanted
        stamp(popup, user)
        action = Action.PAUSED if body.paused else Action.PUBLISHED
        record_activity(db, popup, action, user, from_status=before, to_status=wanted)
        db.commit()
    return PopupStatus(status=popup.status)
