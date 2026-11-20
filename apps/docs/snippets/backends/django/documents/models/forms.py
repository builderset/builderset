"""Forms, their versions, and what visitors sent."""

from django.db import models

from .base import (
    LIVE,
    AuditedModel,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
    one_of,
    person,
    status_column,
)

FORM_STATUSES = (Status.DRAFT, Status.PUBLISHED, Status.CLOSED)


class Form(DocumentModel):
    #: Its public address, example.com/f/<slug>. A new form stores
    #: ``draft-<uuid>`` until publishing copies document.meta.slug.
    slug = models.CharField(max_length=80)
    #: document.meta.name, for your list of forms.
    name = models.CharField(max_length=120, default="", db_default="")
    #: ``closed`` keeps the link but shows the form's closed message.
    status = status_column(FORM_STATUSES)
    #: Kept by the response route, for the list and maxResponses.
    response_count = models.IntegerField(default=0, db_default=0)
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = person()

    class Meta:
        db_table = "form"
        permissions = [("publish_form", "Can publish forms")]
        constraints = [
            one_of("status", FORM_STATUSES, table="form"),
            # A deleted form frees its address.
            models.UniqueConstraint(fields=["slug"], condition=LIVE, name="form_slug"),
        ]


class FormRevision(Revision):
    form = models.ForeignKey(
        Form, on_delete=models.DB_CASCADE, related_name="revisions", db_index=False
    )

    class Meta:
        db_table = "form_revision"
        constraints = [one_of("kind", RevisionKind, table="form_revision")]
        indexes = [models.Index(fields=["form", "-created_at"], name="form_revision_history")]


class Triage(models.TextChoices):
    """Your team's own steps for a response. The column has no check: change them freely."""

    NEW = "new"
    CALLED = "called"
    DONE = "done"


class FormResponse(AuditedModel):
    """One row per submission: the answers ``validate_answers`` kept, never the
    raw body. ``created_by`` is the visitor when signed in; ``updated_by`` is
    whoever on your team last triaged it."""

    #: Deleting a form for good deletes its responses with it.
    form = models.ForeignKey(
        Form, on_delete=models.DB_CASCADE, related_name="responses", db_index=False
    )
    #: The version answered: its ``publish`` revision is the form the visitor saw.
    form_version = models.IntegerField()
    answers = models.JSONField()
    locale = models.CharField(max_length=10, null=True, blank=True)
    status = models.CharField(
        max_length=30, choices=Triage, default=Triage.NEW, db_default=Triage.NEW
    )
    note = models.TextField(blank=True, default="", db_default="")
    #: Only when the form's settings.privacy.storeIp is on. ``inet`` in PostgreSQL.
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "form_response"
        indexes = [
            # The inbox: one form's responses, newest first.
            models.Index(
                fields=["form", "-created_at"], condition=LIVE, name="form_response_inbox"
            ),
            # The retention job deletes responses past settings.privacy.keepMonths
            # for good: the one place a row is removed, because the law asks for it.
            models.Index(fields=["created_at"], name="form_response_age"),
        ]
