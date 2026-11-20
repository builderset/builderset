"""Forms, their versions, and what visitors sent."""

from datetime import datetime
from ipaddress import IPv4Address, IPv6Address
from typing import Any

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Audited,
    Base,
    DocumentMixin,
    RevisionMixin,
    Status,
    User,
    one_of,
    user_id,
)

FORM_STATUSES = (Status.DRAFT, Status.PUBLISHED, Status.CLOSED)
#: Where a response starts in your team's triage: new, called, done…
NEW_RESPONSE = "new"


class Form(Audited, DocumentMixin, Base):
    __tablename__ = "form"
    __table_args__ = (one_of("status", FORM_STATUSES),)

    #: example.com/f/<slug>. A new form stores ``draft-<uuid>`` until publishing
    #: copies document.meta.slug.
    slug: Mapped[str] = mapped_column(String(80))
    #: A copy of document.meta.name, for your list.
    name: Mapped[str] = mapped_column(String(120), server_default="")
    #: ``closed`` keeps the link but shows the form's closed message.
    status: Mapped[str] = mapped_column(String(16), server_default=Status.DRAFT)
    #: Kept by the response route, for the list and ``maxResponses``.
    response_count: Mapped[int] = mapped_column(server_default="0")
    closed_at: Mapped[datetime | None]
    closed_by_id: Mapped[int | None] = user_id()
    closed_by: Mapped[User | None] = relationship(foreign_keys=[closed_by_id])


# A deleted form frees its address.
Index("form_slug", Form.slug, unique=True, postgresql_where=Form.live())


class FormRevision(RevisionMixin, Base):
    __tablename__ = "form_revision"

    #: A response's form_version finds the revision the visitor saw.
    document_id: Mapped[int] = mapped_column("form_id", ForeignKey("form.id", ondelete="CASCADE"))


Index("form_revision_history", FormRevision.document_id, FormRevision.created_at.desc())


class FormResponse(Audited, Base):
    """One row per submission: the answers ``validate_answers`` kept, never the
    raw body. ``created_by`` is the visitor when signed in; ``updated_by`` is
    whoever on your team last triaged it."""

    __tablename__ = "form_response"

    form_id: Mapped[int] = mapped_column(ForeignKey("form.id", ondelete="CASCADE"))
    #: The version answered: its ``publish`` revision is the form the visitor saw.
    form_version: Mapped[int]
    answers: Mapped[dict[str, Any]]
    locale: Mapped[str | None] = mapped_column(String(10))

    # Your team's own triage
    status: Mapped[str] = mapped_column(String(30), server_default=NEW_RESPONSE)
    note: Mapped[str] = mapped_column(Text, server_default="")

    #: Only when the form's settings.privacy.storeIp is on.
    ip: Mapped[IPv4Address | IPv6Address | None] = mapped_column(INET)


# The inbox: one form's responses, newest first.
Index(
    "form_response_inbox",
    FormResponse.form_id,
    FormResponse.created_at.desc(),
    postgresql_where=FormResponse.live(),
)
# The retention job: responses older than settings.privacy.keepMonths are
# deleted for good, the one place a row is removed, because the law says so.
Index("form_response_age", FormResponse.created_at)
