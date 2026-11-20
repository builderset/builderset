"""The audit work every write shares: finding a live row, stamping who changed
it, logging what happened, soft delete and restore. Each joins the caller's
transaction; the route commits once, so the row and its activity are written
together or not at all."""

from collections.abc import Sequence
from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import ConflictError, NotFoundError
from app.models import Action, Activity, SubjectType, User
from app.models.base import Audited

Row = TypeVar("Row", bound=Audited)


def find(
    db: Session, model: type[Row], uuid: UUID, *, deleted: bool = False, lock: bool = False
) -> Row:
    """The live row with this public id; with ``deleted``, the one in the trash.
    A deleted row is not found anywhere else."""
    query = select(model).where(
        model.uuid == uuid,
        model.deleted_at.is_not(None) if deleted else model.live(),
    )
    row = db.scalar(query.with_for_update() if lock else query)
    if row is None:
        raise NotFoundError(f"There is no such {model.__tablename__.replace('_', ' ')}.")
    return row


def stamp(row: Audited, user: User | None) -> None:
    """Who changed the row; the ORM keeps ``updated_at``. A new row is theirs too."""
    if row.id is None:
        row.created_by = user
    row.updated_by = user


def record_activity(
    db: Session,
    row: Audited,
    action: Action,
    actor: User | None,
    *,
    from_status: str | None = None,
    to_status: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    """Append one line to the row's timeline. A new row is flushed first: the
    line names it by its id."""
    if row.id is None:
        db.flush()
    db.add(
        Activity(
            subject_type=SubjectType(row.__tablename__),
            subject_id=row.id,
            action=action,
            from_status=from_status,
            to_status=to_status,
            details=details or {},
            actor=actor,
        )
    )


def soft_delete(db: Session, row: Audited, user: User, *, status: str | None = None) -> None:
    """Stamp who deleted it and when. The row stays, with its history."""
    row.deleted_at = func.now()
    row.deleted_by = user
    stamp(row, user)
    record_activity(db, row, Action.DELETED, user, from_status=status)


def restore(db: Session, row: Audited, user: User, *, status: str | None = None) -> None:
    """Take a row out of the trash, unless a live one took its address meanwhile."""
    row.deleted_at = None
    row.deleted_by = None
    stamp(row, user)
    try:
        db.flush()
    except IntegrityError:
        # A partial unique index (a slug, an active design) refuses it now.
        raise ConflictError("Its address was taken while it was deleted.") from None
    record_activity(db, row, Action.RESTORED, user, to_status=status)


def timeline(db: Session, row: Audited, limit: int) -> Sequence[Activity]:
    """One row's activity, newest first."""
    return db.scalars(
        select(Activity)
        .where(
            Activity.subject_type == row.__tablename__,
            Activity.subject_id == row.id,
        )
        .order_by(Activity.created_at.desc(), Activity.id.desc())
        .limit(limit)
    ).all()
