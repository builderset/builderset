"""Who did what, and when: one row per action, never edited.

Revisions keep what a document said; this keeps what happened to it. It has no
foreign key to its subject on purpose: it outlives what it describes.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import BigInteger, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AppUser, Base, Identified, choice, user_id


class SubjectType(StrEnum):
    """Every table the log can describe; this example writes the first."""

    EMAIL_TEMPLATE = "email_template"
    ARTICLE = "article"
    FORM = "form"
    FORM_RESPONSE = "form_response"
    SAVED_SECTION = "saved_section"
    MEDIA = "media"


class Action(StrEnum):
    CREATED = "created"
    #: A manual save. Autosaves are not logged.
    SAVED = "saved"
    #: A name, slug or title changed.
    RENAMED = "renamed"
    #: Went live, or went live again.
    PUBLISHED = "published"
    SCHEDULED = "scheduled"
    #: Back to draft.
    UNPUBLISHED = "unpublished"
    #: A form stopped taking responses.
    CLOSED = "closed"
    #: A revision restored.
    REVERTED = "reverted"
    #: A form response's triage.
    STATUS_CHANGED = "status_changed"
    DELETED = "deleted"
    RESTORED = "restored"


class Activity(Identified, Base):
    __tablename__ = "activity"

    # What it happened to
    subject_type: Mapped[SubjectType] = mapped_column(
        choice(SubjectType, 30, column="subject_type")
    )
    subject_id: Mapped[int] = mapped_column(BigInteger)

    # What happened
    action: Mapped[Action] = mapped_column(choice(Action, 30, column="action"))
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str | None] = mapped_column(String(30))
    #: What else matters: ``{"revision": "<its uuid>"}``.
    details: Mapped[dict[str, Any]] = mapped_column(server_default=text("'{}'"))

    # Who and when
    #: ``None``: a job, or a visitor.
    actor_id: Mapped[int | None] = user_id()
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    actor: Mapped[AppUser | None] = relationship()


# One document's timeline.
Index(
    "activity_timeline",
    Activity.subject_type,
    Activity.subject_id,
    Activity.created_at.desc(),
)

# One person's work.
Index("activity_by_actor", Activity.actor_id, Activity.created_at.desc())
