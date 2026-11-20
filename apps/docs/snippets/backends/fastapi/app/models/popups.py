"""Popups, their versions, what visitors sent through them, and how they did."""

from datetime import date, datetime
from enum import StrEnum
from ipaddress import IPv4Address, IPv6Address
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, SmallInteger, String, text
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Audited, Base, DocumentMixin, RevisionMixin, Status, one_of
from app.models.forms import NEW_RESPONSE

POPUP_STATUSES = (Status.DRAFT, Status.PUBLISHED, Status.PAUSED)


class PopupType(StrEnum):
    """How it sits on the page."""

    MODAL = "modal"
    SLIDEIN = "slidein"
    BARTOP = "bartop"
    BARBOTTOM = "barbottom"
    FULLSCREEN = "fullscreen"
    DRAWER = "drawer"
    INLINE = "inline"


class Popup(Audited, DocumentMixin, Base):
    __tablename__ = "popup"
    __table_args__ = (
        one_of("type", PopupType),
        one_of("status", POPUP_STATUSES),
        CheckConstraint(
            "ends_at is null or starts_at is null or ends_at > starts_at", name="check"
        ),
    )

    #: A copy of document.meta.name, for your list.
    name: Mapped[str] = mapped_column(String(120))
    type: Mapped[str] = mapped_column(String(16), server_default=PopupType.MODAL)
    #: ``paused`` takes it off the site and keeps it as it is.
    status: Mapped[str] = mapped_column(String(16), server_default=Status.DRAFT)

    # Copies of the document's display rules, so the site asks one indexed
    # question: which popups may show on this page now. The rest of the rules
    # (audience, frequency, device) run in the browser with shouldShow.
    starts_at: Mapped[datetime | None]
    ends_at: Mapped[datetime | None]
    #: When two popups match a page, the higher one shows.
    priority: Mapped[int] = mapped_column(SmallInteger, server_default=text("0"))


# The site's question, on every page view.
Index(
    "popup_live",
    Popup.priority.desc(),
    postgresql_where=(Popup.status == Status.PUBLISHED) & Popup.live(),
)


class PopupRevision(RevisionMixin, Base):
    __tablename__ = "popup_revision"

    document_id: Mapped[int] = mapped_column("popup_id", ForeignKey("popup.id", ondelete="CASCADE"))


Index("popup_revision_history", PopupRevision.document_id, PopupRevision.created_at.desc())


class PopupSubmission(Audited, Base):
    """What a visitor typed into a popup's inputs: the values
    ``validate_submission`` kept, never the raw body. ``created_by`` is the
    visitor when signed in."""

    __tablename__ = "popup_submission"

    popup_id: Mapped[int] = mapped_column(ForeignKey("popup.id", ondelete="CASCADE"))
    #: The version they saw: its ``publish`` revision is the popup as it was.
    popup_version: Mapped[int]
    answers: Mapped[dict[str, Any]]
    #: The page it was sent from.
    page_path: Mapped[str | None] = mapped_column(String(500))
    locale: Mapped[str | None] = mapped_column(String(10))
    #: Your team's triage, as a form response's.
    status: Mapped[str] = mapped_column(String(30), server_default=NEW_RESPONSE)
    #: Only if your privacy rules allow it.
    ip: Mapped[IPv4Address | IPv6Address | None] = mapped_column(INET)


# Its inbox: one popup's submissions, newest first.
Index(
    "popup_submission_inbox",
    PopupSubmission.popup_id,
    PopupSubmission.created_at.desc(),
    postgresql_where=PopupSubmission.live(),
)


class PopupEvent(StrEnum):
    """What PopupView's onEvent reports: each one is a counter of the day's row."""

    SHOWN = "shown"
    CLOSED = "closed"
    CLICKED = "clicked"
    SUBMITTED = "submitted"


class PopupDailyStat(Base):
    """How one popup did on one day: counters added to with an upsert, never
    one row per view."""

    __tablename__ = "popup_daily_stat"

    popup_id: Mapped[int] = mapped_column(
        ForeignKey("popup.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(primary_key=True)
    shown: Mapped[int] = mapped_column(server_default="0")
    closed: Mapped[int] = mapped_column(server_default="0")
    clicked: Mapped[int] = mapped_column(server_default="0")
    submitted: Mapped[int] = mapped_column(server_default="0")
