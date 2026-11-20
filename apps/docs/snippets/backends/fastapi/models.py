"""The data model's tables, for all three builders: the names and columns of
schema.sql. ``alembic revision --autogenerate`` writes the migration from them."""

from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import INET, JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

#: Stored whole, exactly as the editor sent it. ``None`` is SQL NULL, not JSON null.
Document = JSONB(none_as_null=True)
#: Milliseconds, as JavaScript keeps time: the ``saved_at`` the editor sends
#: back is then exactly the one stored.
Instant = TIMESTAMP(timezone=True, precision=3)


class Base(DeclarativeBase):
    pass


class DocumentRow:
    """What every document row has: the live document, the draft since, and
    ``saved_at``, which changes on every write."""

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    status: Mapped[str] = mapped_column(Text, server_default="draft")
    document: Mapped[dict[str, Any]] = mapped_column(Document)
    draft_document: Mapped[dict[str, Any] | None] = mapped_column(Document)
    saved_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())
    #: Counts publishes.
    version: Mapped[int] = mapped_column(Integer, server_default="0")
    published_at: Mapped[datetime | None] = mapped_column(Instant)
    created_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())


class EmailTemplate(DocumentRow, Base):
    __tablename__ = "email_template"
    __table_args__ = (
        CheckConstraint("status in ('draft', 'published')", name="email_template_status"),
    )

    name: Mapped[str] = mapped_column(String(120))
    #: The email type it is for (password_reset, newsletter): its variables.
    type_key: Mapped[str | None] = mapped_column(String(60))
    created_by: Mapped[int | None] = mapped_column(BigInteger)


# One active design per email type: the one the mailer sends.
Index(
    "email_template_active_type",
    EmailTemplate.type_key,
    unique=True,
    postgresql_where=EmailTemplate.status == "published",
)


class Article(DocumentRow, Base):
    __tablename__ = "article"
    __table_args__ = (
        CheckConstraint(
            "status in ('draft', 'scheduled', 'published', 'archived')", name="article_status"
        ),
        UniqueConstraint("slug", "locale"),
    )

    slug: Mapped[str] = mapped_column(String(200))
    locale: Mapped[str] = mapped_column(String(10))
    scheduled_at: Mapped[datetime | None] = mapped_column(Instant)
    # Copies of document.meta, written with the document, for lists and search.
    title: Mapped[str] = mapped_column(String(300), server_default="")
    excerpt: Mapped[str] = mapped_column(String(600), server_default="")
    cover_key: Mapped[str | None] = mapped_column(String(300))
    cover_alt: Mapped[str | None] = mapped_column(String(300))
    author_id: Mapped[int | None] = mapped_column(BigInteger)


Index(
    "article_published",
    Article.locale,
    Article.published_at.desc(),
    postgresql_where=Article.status == "published",
)
# A job publishes these when their time comes.
Index("article_due", Article.scheduled_at, postgresql_where=Article.status == "scheduled")


class Form(DocumentRow, Base):
    __tablename__ = "form"
    __table_args__ = (
        CheckConstraint("status in ('draft', 'published', 'closed')", name="form_status"),
    )

    #: Its public address: example.com/f/<slug>. A copy of document.meta.slug.
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(120), server_default="")
    #: Kept by the response route, for the list and ``maxResponses``.
    response_count: Mapped[int] = mapped_column(Integer, server_default="0")
    created_by: Mapped[int | None] = mapped_column(BigInteger)


class FormResponse(Base):
    """One row per submission: the answers ``validate_answers`` kept, never the raw body."""

    __tablename__ = "form_response"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("form.id", ondelete="CASCADE"))
    #: The version answered: a later edit to the form does not change what it asked.
    form_version: Mapped[int] = mapped_column(Integer)
    answers: Mapped[dict[str, Any]] = mapped_column(JSONB)
    locale: Mapped[str | None] = mapped_column(String(10))
    #: Your team's own triage: new, called, done.
    status: Mapped[str] = mapped_column(String(30), server_default="new")
    #: Only when the form's settings.privacy.storeIp is on.
    ip: Mapped[str | None] = mapped_column(INET)
    created_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())


Index("form_response_latest", FormResponse.form_id, FormResponse.created_at.desc())


class Revision(Base):
    """A version to go back to: every manual save and publish, and a few autosaves."""

    __tablename__ = "revision"
    __table_args__ = (
        CheckConstraint("document_kind in ('email', 'article', 'form')", name="revision_document"),
        CheckConstraint("kind in ('autosave', 'manual', 'publish')", name="revision_kind"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    document_kind: Mapped[str] = mapped_column(Text)
    document_id: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column(Text)
    label: Mapped[str | None] = mapped_column(String(120))
    document: Mapped[dict[str, Any]] = mapped_column(JSONB)
    author_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())


Index("revision_history", Revision.document_kind, Revision.document_id, Revision.created_at.desc())


class SavedSection(Base):
    """A piece of a document saved to reuse: an email header, an article's call to action."""

    __tablename__ = "saved_section"
    __table_args__ = (
        CheckConstraint("kit in ('email', 'article', 'form')", name="saved_section_kit"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    kit: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(120))
    fragment: Mapped[dict[str, Any]] = mapped_column(JSONB)
    #: An email section kept in step everywhere it is used.
    synced: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_by: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())


class Media(Base):
    """Every uploaded file, by the key the documents store."""

    __tablename__ = "media"
    __table_args__ = (
        CheckConstraint("kind in ('image', 'video', 'audio', 'file')", name="media_kind"),
    )

    key: Mapped[str] = mapped_column(String(300), primary_key=True)
    kind: Mapped[str] = mapped_column(Text)
    mime: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(300))
    owner_id: Mapped[int | None] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(Instant, server_default=func.now())
