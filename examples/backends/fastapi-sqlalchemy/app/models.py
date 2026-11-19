"""The email templates, one row each. A change here needs a migration:
``alembic revision --autogenerate -m "…"`` writes it from the difference."""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Identity, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

#: Stored whole, exactly as the editor sent it. ``None`` is SQL NULL, not JSON null.
Document = JSONB(none_as_null=True)


class Base(DeclarativeBase):
    pass


class EmailTemplate(Base):
    __tablename__ = "email_template"

    id: Mapped[int] = mapped_column(Identity(always=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    #: ``draft`` or ``published``. Only a published template is sent.
    status: Mapped[str] = mapped_column(Text, server_default="draft")
    #: The live document: what a recipient gets.
    document: Mapped[dict[str, Any]] = mapped_column(Document)
    #: The working copy; ``None`` when there are no unpublished changes.
    draft_document: Mapped[dict[str, Any] | None] = mapped_column(Document)
    #: Changes on every write. The editor sends it back, and a different one
    #: means someone else saved in between.
    saved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
