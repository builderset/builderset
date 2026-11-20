"""The audit work every write shares: who did it, the revision, the activity row.

Each function only adds to the session. The route commits once, so a row, its
revision and its activity are written together or not at all.
"""

from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.errors import ConflictError
from app.models import (
    Action,
    Activity,
    AppUser,
    Audited,
    EmailTemplate,
    EmailTemplateRevision,
    RevisionKind,
    Status,
    SubjectType,
)

#: How the activity log names each audited table. Add yours here.
SUBJECTS: dict[type[Audited], SubjectType] = {EmailTemplate: SubjectType.EMAIL_TEMPLATE}


def stamp_created(row: Audited, actor: AppUser) -> None:
    row.created_by = actor
    row.updated_by = actor


def stamp_updated(row: Audited, actor: AppUser) -> None:
    row.updated_by = actor


def record_activity(
    db: Session,
    row: Audited,
    action: Action,
    actor: AppUser | None,
    *,
    from_status: str | None = None,
    to_status: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """One line in the row's timeline. Never for an autosave."""
    db.flush()  # A new row gets its id here.
    db.add(
        Activity(
            subject_type=SUBJECTS[type(row)],
            subject_id=row.id,
            action=action,
            from_status=from_status,
            to_status=to_status,
            details=details or {},
            actor=actor,
        )
    )


def record_revision(
    db: Session,
    template: EmailTemplate,
    kind: RevisionKind,
    document: dict[str, Any],
    actor: AppUser,
    label: str | None = None,
) -> EmailTemplateRevision:
    """A version to go back to, at the template's current ``version``."""
    revision = EmailTemplateRevision(
        email_template_id=template.id,
        kind=kind,
        label=label,
        version=template.version,
        document=document,
        created_by=actor,
    )
    db.add(revision)
    db.flush()  # Its uuid, for the activity that names it.
    return revision


def soft_delete(db: Session, row: Audited, actor: AppUser, *, status: str) -> None:
    """Into the trash. A live document is not deleted: it is unpublished first,
    so nothing a reader or the mailer uses disappears."""
    if status == Status.PUBLISHED:
        raise ConflictError("It is published: unpublish it before deleting it.")
    row.deleted_at = func.now()
    row.deleted_by = actor
    row.updated_by = actor
    record_activity(db, row, Action.DELETED, actor, from_status=status)


def restore(db: Session, row: Audited, actor: AppUser, *, status: str) -> None:
    """Out of the trash. If a partial unique index now refuses the row (another
    live one took its place meanwhile), the write fails: 409, in ``app.errors``."""
    row.deleted_at = None
    row.deleted_by = None
    row.updated_by = actor
    record_activity(db, row, Action.RESTORED, actor, to_status=status)
