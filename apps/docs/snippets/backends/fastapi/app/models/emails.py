"""Email templates: a design for each email your app sends, and its versions."""

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Audited, Base, DocumentMixin, RevisionMixin, Status, one_of

EMAIL_STATUSES = (Status.DRAFT, Status.PUBLISHED)


class EmailTemplate(Audited, DocumentMixin, Base):
    __tablename__ = "email_template"
    __table_args__ = (one_of("status", EMAIL_STATUSES),)

    #: A copy of document.meta.name, for your list.
    name: Mapped[str] = mapped_column(String(120))
    #: The email type it is for (password_reset, newsletter): its variables.
    type_key: Mapped[str | None] = mapped_column(String(60))
    #: ``published`` is the active design the mailer sends for its type.
    status: Mapped[str] = mapped_column(String(16), server_default=Status.DRAFT)


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


class EmailTemplateRevision(RevisionMixin, Base):
    __tablename__ = "email_template_revision"

    document_id: Mapped[int] = mapped_column(
        "email_template_id", ForeignKey("email_template.id", ondelete="CASCADE")
    )


Index(
    "email_template_revision_history",
    EmailTemplateRevision.document_id,
    EmailTemplateRevision.created_at.desc(),
)
