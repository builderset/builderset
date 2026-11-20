"""What every table shares: a public uuid, and who made, changed and deleted
each row, and when. Deleting is a soft delete: the row stays, stamped."""

import uuid
from collections.abc import Iterable
from datetime import UTC, datetime
from typing import Any, Self

from django.conf import settings
from django.contrib.postgres.functions import RandomUUID
from django.db import models
from django.db.models import Q
from django.db.models.functions import Now


class Status(models.TextChoices):
    """Where a document is. Each builder uses some of these; its model says which."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    CLOSED = "closed"
    #: A popup taken off the site, kept as it is.
    PAUSED = "paused"


class RevisionKind(models.TextChoices):
    """Why a revision was written."""

    AUTOSAVE = "autosave"
    MANUAL = "manual"
    PUBLISH = "publish"


def person() -> models.ForeignKey:
    """A column naming one of your users. Removing the user keeps the row,
    without their name on it."""
    return models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.DB_SET_NULL,
        related_name="+",
        # As in the SQL: no list reads by these alone, so no index on each.
        db_index=False,
    )


def one_of(column: str, values: Iterable[str], *, table: str) -> models.CheckConstraint:
    """The SQL's ``check (column in (…))``, under the name PostgreSQL gives it."""
    return models.CheckConstraint(
        condition=Q(**{f"{column}__in": list(values)}), name=f"{table}_{column}_check"
    )


# The condition of every partial index and unique rule: only live rows count.
LIVE = Q(deleted_at__isnull=True)


class MillisecondsField(models.DateTimeField):
    """``timestamptz(3)``: an instant to the millisecond, as JavaScript keeps
    it, so the ``saved_at`` the editor sends back equals the one stored."""

    def db_type(self, connection: Any) -> str | None:
        if connection.vendor == "postgresql":
            return "timestamptz(3)"
        return super().db_type(connection)


def now_ms() -> datetime:
    """Now, cut to the millisecond, for a ``MillisecondsField``."""
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


class LiveQuerySet(models.QuerySet[Any]):
    """Every query says which rows it means: ``live()`` or ``deleted()``."""

    def live(self) -> Self:
        return self.filter(LIVE)

    def deleted(self) -> Self:
        return self.filter(deleted_at__isnull=False)

    def update_by(self, actor: Any, **columns: Any) -> int:
        """``update()``, stamping who and when: a queryset update skips ``auto_now``."""
        return self.update(updated_at=Now(), updated_by=actor, **columns)


class AuditedModel(models.Model):
    """The audit columns. The server writes them; it never takes them from a request."""

    id = models.BigAutoField(primary_key=True)
    #: The public id: the only one in URLs and answers. Python makes it, so a new
    #: row knows it before it is saved; the database default covers psql and jobs.
    uuid = models.UUIDField(
        default=uuid.uuid4, db_default=RandomUUID(), unique=True, editable=False
    )
    created_at = models.DateTimeField(db_default=Now(), editable=False)
    created_by = person()
    updated_at = models.DateTimeField(auto_now=True, db_default=Now())
    updated_by = person()
    #: None while the row is live.
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = person()

    objects = LiveQuerySet.as_manager()

    class Meta:
        abstract = True


class DocumentModel(AuditedModel):
    """A row holding a builder's document: the live one, the draft since, and
    the two clocks. ``updated_at`` follows any change to the row; ``saved_at``
    only a change to the document, and is the editor's conflict check."""

    #: What readers get, what is sent, what the form shows. Checked strictly.
    document = models.JSONField()
    #: Work in progress since the last publish; None when there is none.
    draft_document = models.JSONField(null=True, blank=True)
    saved_at = MillisecondsField(db_default=Now())
    #: Counts publishes. A revision and a form response record the one they belong to.
    version = models.IntegerField(default=0, db_default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = person()

    class Meta:
        abstract = True


def status_column(statuses: Iterable[Status]) -> models.CharField:
    """A document's ``status``, holding one of its builder's statuses."""
    return models.CharField(
        max_length=16,
        choices=[(status.value, status.label) for status in statuses],
        default=Status.DRAFT,
        db_default=Status.DRAFT,
    )


class Revision(models.Model):
    """A version to go back to. Written once and never changed, so it has no
    ``updated_*`` or ``deleted_*``: restoring one writes a new one."""

    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(
        default=uuid.uuid4, db_default=RandomUUID(), unique=True, editable=False
    )
    kind = models.CharField(max_length=16, choices=RevisionKind)
    #: A name someone gave it: "Before the legal review".
    label = models.CharField(max_length=120, null=True, blank=True)
    #: The document's version then.
    version = models.IntegerField()
    document = models.JSONField()
    created_at = models.DateTimeField(db_default=Now(), editable=False)
    created_by = person()

    class Meta:
        abstract = True
