"""What each write to a document does, in the data model's order: check the
document, write the row with who did it, keep a revision on a manual save or a
publish, and log the activity. The routes call these, then commit once."""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import find, record_activity, restore, soft_delete, stamp
from app.checks import EMAIL_TYPES, Level, checked
from app.errors import ConflictError, InvalidDocumentError, InvalidInputError
from app.kinds import DocumentRow, Kind, RevisionRow
from app.models import Action, Article, EmailTemplate, Form, Kit, RevisionKind, Status, User
from app.schemas import DraftSave, NamedRevision, NewDocument, Publish, SaveReason


# region create
def check(kind: Kind, row: DocumentRow, document: Any, level: Level) -> dict[str, Any]:
    """The kit's check; an email is checked against its type's variables."""
    type_key = row.type_key if isinstance(row, EmailTemplate) else None
    return checked(kind.kit, document, level, type_key=type_key)


def keep_revision(
    db: Session,
    kind: Kind,
    row: DocumentRow,
    revision_kind: RevisionKind,
    document: dict[str, Any],
    user: User,
    label: str | None = None,
) -> RevisionRow:
    revision = kind.revision(
        document_id=row.id,
        kind=revision_kind,
        label=label,
        version=row.version,
        document=document,
        created_by=user,
    )
    db.add(revision)
    return revision


def _new_columns(kind: Kind, body: NewDocument, user: User) -> dict[str, Any]:
    """What a new row takes from the request, besides its document."""
    if kind.kit == Kit.EMAIL:
        if body.type_key is not None and body.type_key not in EMAIL_TYPES:
            raise InvalidInputError(f"There is no email type {body.type_key!r}.")
        return {"type_key": body.type_key}
    if kind.kit == Kit.ARTICLE:
        if not body.slug or not body.locale:
            raise InvalidInputError("A new article needs a slug and a locale.")
        return {"slug": body.slug, "locale": body.locale, "author": user}
    # A form's address is unique, and a new form often has none yet: this holds
    # its place until publishing copies document.meta.slug.
    return {"slug": f"draft-{uuid4()}"}


def create_document(db: Session, kind: Kind, body: NewDocument, user: User) -> DocumentRow:
    columns = _new_columns(kind, body, user)
    document = checked(kind.kit, body.document, Level.DRAFT, type_key=body.type_key)
    row = kind.model(document=document, **(kind.copies(document) | columns))
    stamp(row, user)
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        raise ConflictError("That address is taken.") from None
    record_activity(db, row, Action.CREATED, user, to_status=Status.DRAFT)
    return row


# endregion


# region draft
def save_draft(db: Session, kind: Kind, document_id: UUID, body: DraftSave, user: User) -> datetime:
    """An autosave or a manual save. Readers still get the live document."""
    row = find(db, kind.model, document_id)
    document = check(kind, row, body.document, Level.DRAFT)
    model = kind.model
    stale = ConflictError(f"Someone else saved this {kind.noun} since you opened it.")
    # Written only if the row still has the saved_at the editor last saw, so
    # two saves at once cannot both win. Only "keep mine" (force) skips it.
    if not body.force and body.expected_saved_at is None:
        raise stale
    unchanged = [] if body.force else [model.saved_at == body.expected_saved_at]
    saved_at: datetime | None = db.scalar(
        update(model)
        .where(model.id == row.id, *unchanged)
        .values(draft_document=document, saved_at=func.now(), updated_by_id=user.id)
        .returning(model.saved_at)
    )
    if saved_at is None:
        raise stale
    # Autosaves come every few seconds of typing: neither kept nor logged.
    if body.reason == SaveReason.MANUAL:
        keep_revision(db, kind, row, RevisionKind.MANUAL, document, user)
        record_activity(db, row, Action.SAVED, user)
    return saved_at


def save_revision(
    db: Session, kind: Kind, document_id: UUID, body: NamedRevision, user: User
) -> RevisionRow:
    """A version someone named, to come back to. The row itself is unchanged."""
    row = find(db, kind.model, document_id)
    document = check(kind, row, body.document, Level.DRAFT)
    revision = keep_revision(db, kind, row, RevisionKind.MANUAL, document, user, label=body.label)
    record_activity(db, row, Action.SAVED, user, details={"label": body.label})
    return revision


# endregion


# region publish
#: The copies that name a row: changing one is logged as ``renamed``.
NAMES = ("name", "title", "slug")


def publish(db: Session, kind: Kind, document_id: UUID, body: Publish, user: User) -> DocumentRow:
    """The strict check, then the document goes live with its meta copied to
    the columns, kept as a revision and logged."""
    row = find(db, kind.model, document_id, lock=True)
    document = check(kind, row, body.document, Level.PUBLISH)
    before = row.status
    if isinstance(row, EmailTemplate):
        _retire_active_design(db, row, user)
    renamed = _write_copies(row, kind.copies(document))
    row.document = document
    row.draft_document = None
    row.saved_at = func.now()
    row.version += 1
    _go_live(row, user, _later(kind, body.scheduled_at))
    stamp(row, user)
    try:
        db.flush()
    except IntegrityError:
        # Another live form has this address: shown on meta.slug, where it is fixed.
        raise InvalidDocumentError([{"code": "meta.slugTaken", "path": "meta.slug"}]) from None
    keep_revision(db, kind, row, RevisionKind.PUBLISH, document, user)
    action = Action.SCHEDULED if row.status == Status.SCHEDULED else Action.PUBLISHED
    record_activity(db, row, action, user, from_status=before, to_status=row.status)
    if renamed:
        record_activity(db, row, Action.RENAMED, user, details=renamed)
    return row


def _later(kind: Kind, scheduled_at: datetime | None) -> datetime | None:
    """When an article should go live, if that is still to come."""
    if kind.schedules and scheduled_at is not None and scheduled_at > datetime.now(UTC):
        return scheduled_at
    return None


def _retire_active_design(db: Session, row: EmailTemplate, user: User) -> None:
    """One active design per email type: the one live before goes back to draft."""
    if row.type_key is None:
        return
    active = db.scalars(
        select(EmailTemplate)
        .where(
            EmailTemplate.type_key == row.type_key,
            EmailTemplate.status == Status.PUBLISHED,
            EmailTemplate.live(),
            EmailTemplate.id != row.id,
        )
        .with_for_update()
    )
    for other in active:
        other.status = Status.DRAFT
        stamp(other, user)
        record_activity(
            db,
            other,
            Action.UNPUBLISHED,
            user,
            from_status=Status.PUBLISHED,
            to_status=Status.DRAFT,
            details={"replaced_by": str(row.uuid)},
        )
    # Written before this one goes live: the index allows one at a time.
    db.flush()


def _write_copies(row: DocumentRow, copies: dict[str, Any]) -> dict[str, Any]:
    """Copy the meta to its columns; answers what a rename changed, for the log."""
    renamed = {}
    for column, value in copies.items():
        before = getattr(row, column)
        if column in NAMES and before != value:
            renamed[column] = {"from": before, "to": value}
        setattr(row, column, value)
    return renamed


def _go_live(row: DocumentRow, user: User, later: datetime | None) -> None:
    row.published_by = user
    if isinstance(row, Article):
        # A job of yours sets a scheduled article live at scheduled_at.
        row.status = Status.SCHEDULED if later else Status.PUBLISHED
        row.scheduled_at = later
        # An article keeps its first publish date: the site's list sorts by it.
        if not later and row.published_at is None:
            row.published_at = func.now()
        return
    row.status = Status.PUBLISHED
    row.published_at = func.now()
    if isinstance(row, Form):
        row.closed_at = None
        row.closed_by = None


# endregion


# region lifecycle
def unpublish(db: Session, kind: Kind, document_id: UUID, user: User) -> DocumentRow:
    """Readers no longer get it; the document is kept. A form is closed instead:
    its link keeps working and shows the closed message."""
    row = find(db, kind.model, document_id, lock=True)
    before = row.status
    if before not in (Status.PUBLISHED, Status.SCHEDULED):
        return row
    row.status = kind.unpublished
    if isinstance(row, Article):
        row.scheduled_at = None
    if isinstance(row, Form):
        row.closed_at = func.now()
        row.closed_by = user
    stamp(row, user)
    action = Action.CLOSED if row.status == Status.CLOSED else Action.UNPUBLISHED
    record_activity(db, row, action, user, from_status=before, to_status=row.status)
    return row


def delete_document(db: Session, kind: Kind, document_id: UUID, user: User) -> None:
    row = find(db, kind.model, document_id, lock=True)
    if row.status == Status.PUBLISHED:
        raise ConflictError(f"This {kind.noun} is live: unpublish it first.")
    soft_delete(db, row, user, status=row.status)


def restore_document(db: Session, kind: Kind, document_id: UUID, user: User) -> DocumentRow:
    row = find(db, kind.model, document_id, deleted=True)
    restore(db, row, user, status=row.status)
    return row


# endregion
