"""Activity: who did what, and when. Revisions keep what a document said; this
keeps what happened to it."""

import uuid

from django.contrib.postgres.functions import RandomUUID
from django.db import models
from django.db.models.functions import Now

from .base import one_of, person


class SubjectType(models.TextChoices):
    """Which table the row it happened to is in."""

    EMAIL_TEMPLATE = "email_template"
    ARTICLE = "article"
    FORM = "form"
    FORM_RESPONSE = "form_response"
    SAVED_SECTION = "saved_section"
    MEDIA = "media"


class Action(models.TextChoices):
    CREATED = "created"  # a new row
    SAVED = "saved"  # a manual save; autosaves are not logged
    RENAMED = "renamed"  # name, slug or title changed
    PUBLISHED = "published"  # went live, or went live again
    SCHEDULED = "scheduled"  # set to go live later
    UNPUBLISHED = "unpublished"  # back to draft
    CLOSED = "closed"  # a form stopped taking responses
    REVERTED = "reverted"  # a revision restored
    STATUS_CHANGED = "status_changed"  # a response's triage
    DELETED = "deleted"  # soft-deleted
    RESTORED = "restored"  # undeleted


class Activity(models.Model):
    """One row per action, written in the same transaction as the action and
    never edited: give your app's database role no ``update`` or ``delete`` on it.

    No foreign key to the subject, on purpose: the log outlives what it
    describes, deleted for good or not."""

    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(
        default=uuid.uuid4, db_default=RandomUUID(), unique=True, editable=False
    )

    # What it happened to
    subject_type = models.CharField(max_length=30, choices=SubjectType)
    subject_id = models.BigIntegerField()

    # What happened
    action = models.CharField(max_length=30, choices=Action)
    from_status = models.CharField(max_length=30, null=True, blank=True)
    to_status = models.CharField(max_length=30, null=True, blank=True)
    #: What else matters: { "revision": "…", "from": "old-slug" }.
    details = models.JSONField(default=dict, db_default={})

    # Who and when
    #: None for a job (a scheduled publish) or a visitor.
    actor = person()
    created_at = models.DateTimeField(db_default=Now(), editable=False)

    class Meta:
        db_table = "activity"
        verbose_name_plural = "activity"
        constraints = [
            one_of("subject_type", SubjectType, table="activity"),
            one_of("action", Action, table="activity"),
        ]
        indexes = [
            # One document's timeline.
            models.Index(
                fields=["subject_type", "subject_id", "-created_at"], name="activity_timeline"
            ),
            # One person's work.
            models.Index(fields=["actor", "-created_at"], name="activity_by_actor"),
        ]
