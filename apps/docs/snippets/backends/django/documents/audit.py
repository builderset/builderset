"""The audit work every write shares: who did it, the revision, the line in
the activity log, and deleting and restoring. Call these inside the write's
transaction, so the row and its history are stored together or not at all."""

from typing import Any

from django.contrib.auth.base_user import AbstractBaseUser
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.request import Request

from .errors import Conflict
from .models import (
    Action,
    Activity,
    AuditedModel,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
)

#: Who did it: the signed-in user, or None for a visitor or a job.
Actor = AbstractBaseUser | None


def actor_of(request: Request) -> Actor:
    """The signed-in user. Never a user id from the request body."""
    return request.user if request.user.is_authenticated else None


def stamp(row: AuditedModel, actor: Actor) -> None:
    """Name who changed the row, and who made it when it is new."""
    if row._state.adding:
        row.created_by = actor
    row.updated_by = actor


def record_activity(
    subject: AuditedModel,
    action: Action,
    actor: Actor,
    *,
    from_status: str | None = None,
    to_status: str | None = None,
    details: dict[str, Any] | None = None,
) -> Activity:
    """Append one line to the log. Its subject_type is the subject's table."""
    return Activity.objects.create(
        subject_type=subject._meta.db_table,
        subject_id=subject.pk,
        action=action,
        from_status=from_status,
        to_status=to_status,
        details=details or {},
        actor=actor,
    )


def record_revision(
    row: DocumentModel,
    kind: RevisionKind,
    document: dict[str, Any],
    actor: Actor,
    *,
    label: str | None = None,
) -> Revision:
    """Keep a whole document to look at or go back to, at the row's version."""
    revision: Revision = row.revisions.create(  # type: ignore[attr-defined]
        kind=kind, label=label, version=row.version, document=document, created_by=actor
    )
    return revision


def soft_delete(row: AuditedModel, actor: Actor) -> None:
    """Stamp the row deleted. It stays, so it can be restored and its history
    still makes sense; every live query leaves it out from now on."""
    status = getattr(row, "status", None)
    if isinstance(row, DocumentModel) and status == Status.PUBLISHED:
        raise Conflict(message="It is live: unpublish it first.")
    row.deleted_at = timezone.now()
    row.deleted_by = actor
    row.updated_by = actor
    row.save(update_fields=["deleted_at", "deleted_by", "updated_by", "updated_at"])
    record_activity(row, Action.DELETED, actor, from_status=status)


def restore(row: AuditedModel, actor: Actor) -> None:
    """Undo a soft delete. Refused when a live row took its address meanwhile:
    the partial unique index says so."""
    row.deleted_at = None
    row.deleted_by = None
    row.updated_by = actor
    try:
        # A savepoint: the failed update must not end the request's transaction.
        with transaction.atomic():
            row.save(update_fields=["deleted_at", "deleted_by", "updated_by", "updated_at"])
    except IntegrityError as error:
        raise Conflict(message="Another one has its address now.") from error
    record_activity(row, Action.RESTORED, actor, to_status=getattr(row, "status", None))
