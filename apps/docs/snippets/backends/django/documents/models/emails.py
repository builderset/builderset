"""Email templates: a design for each email your app sends, and its versions."""

from django.db import models
from django.db.models import Q

from .base import (
    LIVE,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
    one_of,
    status_column,
)

EMAIL_STATUSES = (Status.DRAFT, Status.PUBLISHED)


class EmailTemplate(DocumentModel):
    #: The design's working name: document.meta.name.
    name = models.CharField(max_length=120)
    #: The email type it is for (password_reset, newsletter): its variables and checks.
    type_key = models.CharField(max_length=60, null=True, blank=True)
    #: ``published`` is the active design the mailer sends for its type.
    status = status_column(EMAIL_STATUSES)

    class Meta:
        db_table = "email_template"
        # Publishing is its own permission, beside Django's add, change and view.
        permissions = [("publish_emailtemplate", "Can publish email templates")]
        constraints = [
            one_of("status", EMAIL_STATUSES, table="email_template"),
            # One active design per email type: the one the mailer sends.
            models.UniqueConstraint(
                fields=["type_key"],
                condition=Q(status=Status.PUBLISHED) & LIVE,
                name="email_template_one_active_per_type",
            ),
        ]
        indexes = [
            # The list: newest change first.
            models.Index(fields=["-updated_at"], condition=LIVE, name="email_template_list"),
        ]


class EmailTemplateRevision(Revision):
    email_template = models.ForeignKey(
        EmailTemplate, on_delete=models.DB_CASCADE, related_name="revisions", db_index=False
    )

    class Meta:
        db_table = "email_template_revision"
        constraints = [one_of("kind", RevisionKind, table="email_template_revision")]
        indexes = [
            # Django caps an index name at 30 characters: the SQL's is
            # email_template_revision_history.
            models.Index(
                fields=["email_template", "-created_at"], name="email_template_revision_hist"
            ),
        ]
