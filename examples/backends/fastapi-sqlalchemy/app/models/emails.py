"""Email templates, and the versions each one went through."""

from datetime import datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import BigInteger, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import AppUser, Audited, Base, Identified, choice, user_id


class Status(StrEnum):
    DRAFT = "draft"
    #: The active design: what the mailer sends for its type.
    PUBLISHED = "published"


class RevisionKind(StrEnum):
    AUTOSAVE = "autosave"
    MANUAL = "manual"
    PUBLISH = "publish"


class EmailTemplate(Audited, Base):
    __tablename__ = "email_template"

    # What it is
    #: A copy of ``document.meta.name``, for your list.
    name: Mapped[str] = mapped_column(String(120))
    #: The email type it is for (``password_reset``): its variables.
    type_key: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[Status] = mapped_column(
        choice(Status, 16, column="status"), server_default=Status.DRAFT
    )

    # The document
    #: The live document: what the mailer sends.
    document: Mapped[dict[str, Any]]
    #: Unpublished changes; ``None`` when there are none.
    draft_document: Mapped[dict[str, Any] | None]
    #: Changes whenever the document is written, to the millisecond. The editor
    #: sends it back, and a different one means someone else saved in between.
    saved_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True, precision=3), server_default=func.now()
    )
    #: Counts publishes.
    version: Mapped[int] = mapped_column(server_default="0")
    published_at: Mapped[datetime | None]
    published_by_id: Mapped[int | None] = user_id()

    published_by: Mapped[AppUser | None] = relationship(foreign_keys=[published_by_id])


# One active design per email type: the one the mailer sends.
Index(
    "email_template_one_active_per_type",
    EmailTemplate.type_key,
    unique=True,
    postgresql_where=(EmailTemplate.status == Status.PUBLISHED) & EmailTemplate.live(),
)

# The list: newest change first.
Index(
    "email_template_list",
    EmailTemplate.updated_at.desc(),
    postgresql_where=EmailTemplate.live(),
)


class EmailTemplateRevision(Identified, Base):
    """A version to go back to: every manual save and every publish.

    Written once and never changed, so it has no ``updated_*`` or ``deleted_*``.
    """

    __tablename__ = "email_template_revision"

    email_template_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("email_template.id", ondelete="CASCADE")
    )
    kind: Mapped[RevisionKind] = mapped_column(choice(RevisionKind, 16, column="kind"))
    #: A name someone gave it: "Before the legal review".
    label: Mapped[str | None] = mapped_column(String(120))
    #: The template's version when it was written.
    version: Mapped[int]
    document: Mapped[dict[str, Any]]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by_id: Mapped[int | None] = user_id()

    created_by: Mapped[AppUser | None] = relationship()


Index(
    "email_template_revision_history",
    EmailTemplateRevision.email_template_id,
    EmailTemplateRevision.created_at.desc(),
)
