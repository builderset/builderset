"""Activity: who did what to which row, and when. One row per action, written
in the same transaction as the action, and never edited: give your app's
database role no ``update`` or ``delete`` on it."""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import BigInteger, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, User, UuidMixin, one_of, user_id


class SubjectType(StrEnum):
    """Which table the row is in: each value is the table's name."""

    EMAIL_TEMPLATE = "email_template"
    ARTICLE = "article"
    FORM = "form"
    FORM_RESPONSE = "form_response"
    CARD_DESIGN = "card_design"
    CARD_ISSUE = "card_issue"
    POPUP = "popup"
    POPUP_SUBMISSION = "popup_submission"
    SAVED_SECTION = "saved_section"
    MEDIA = "media"


class Action(StrEnum):
    CREATED = "created"
    #: A manual save. Autosaves are not logged.
    SAVED = "saved"
    #: The name, slug or title changed.
    RENAMED = "renamed"
    PUBLISHED = "published"
    SCHEDULED = "scheduled"
    UNPUBLISHED = "unpublished"
    #: A form stopped taking responses.
    CLOSED = "closed"
    #: A popup taken off the site, kept as it is.
    PAUSED = "paused"
    #: A card made out to a member.
    ISSUED = "issued"
    #: A member's card cancelled.
    REVOKED = "revoked"
    #: A revision restored.
    REVERTED = "reverted"
    #: A response's triage.
    STATUS_CHANGED = "status_changed"
    DELETED = "deleted"
    RESTORED = "restored"


class Activity(UuidMixin, Base):
    __tablename__ = "activity"
    __table_args__ = (one_of("subject_type", SubjectType), one_of("action", Action))

    # What it happened to. No foreign key on purpose: the log outlives what it
    # describes, deleted for good or not.
    subject_type: Mapped[str] = mapped_column(String(30))
    subject_id: Mapped[int] = mapped_column(BigInteger)

    # What happened
    action: Mapped[str] = mapped_column(String(30))
    from_status: Mapped[str | None] = mapped_column(String(30))
    to_status: Mapped[str | None] = mapped_column(String(30))
    #: What else matters: { "revision": "…", "from": "old-slug" }
    details: Mapped[dict[str, Any]] = mapped_column(server_default="{}")

    # Who and when. No actor: a job, or a visitor.
    actor_id: Mapped[int | None] = user_id()
    actor: Mapped[User | None] = relationship(foreign_keys=[actor_id])
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# One document's timeline.
Index(
    "activity_timeline",
    Activity.subject_type,
    Activity.subject_id,
    Activity.created_at.desc(),
)
# One person's work.
Index("activity_by_actor", Activity.actor_id, Activity.created_at.desc())
