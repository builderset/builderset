"""The email templates: your list and trash, and what the editor's host calls.

Every write follows the same steps, in one transaction: check the document,
write the row with who did it, record a revision (manual save, publish), and
append the activity (anything but an autosave).
"""

from datetime import datetime
from enum import StrEnum
from typing import Annotated, Any
from uuid import UUID

from builderset.email import render_email
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app import audit
from app.checks import checked, name_of
from app.deps import CurrentUser, Db, LiveEmail, find_email
from app.errors import ConflictError
from app.models import Action, AppUser, EmailTemplate, RevisionKind, Status
from app.schemas import EmailPage, EmailRecord, EmailSummary, Published, Saved, StatusChanged

router = APIRouter(prefix="/api/emails", tags=["emails"])

STALE = "Someone else saved this template since you opened it."


# ── Bodies ───────────────────────────────────────────────────────────────────


class NewEmail(BaseModel):
    #: The back office sends a starter document; its ``meta.name`` names the template.
    document: Any
    type_key: str | None = Field(default=None, max_length=60)


class SaveReason(StrEnum):
    AUTOSAVE = "autosave"
    MANUAL = "manual"
    #: The save just before a publish, which records its own revision.
    PUBLISH = "publish"


class Draft(BaseModel):
    document: Any
    reason: SaveReason = SaveReason.AUTOSAVE
    expected_saved_at: datetime | None = None
    #: "Keep mine": save even though someone else saved since.
    force: bool = False


class Publish(BaseModel):
    document: Any


class Send(BaseModel):
    data: dict[str, Any] = {}


# ── The list and the trash ───────────────────────────────────────────────────


@router.get("")
def list_emails(
    db: Db,
    status: Status | None = None,
    q: Annotated[str | None, Query(max_length=120)] = None,
    deleted: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> EmailPage:
    """Live templates, newest change first; ``deleted=true`` lists the trash instead."""
    where = [EmailTemplate.deleted_at.is_not(None) if deleted else EmailTemplate.live()]
    if status:
        where.append(EmailTemplate.status == status)
    if q:
        where.append(EmailTemplate.name.icontains(q, autoescape=True))
    newest = EmailTemplate.deleted_at if deleted else EmailTemplate.updated_at
    rows = db.scalars(
        select(EmailTemplate).where(*where).order_by(newest.desc()).limit(limit).offset(offset)
    )
    total = db.scalar(select(func.count()).select_from(EmailTemplate).where(*where)) or 0
    return EmailPage(items=[EmailSummary.model_validate(row) for row in rows], total=total)


@router.post("", status_code=201)
def create(body: NewEmail, me: CurrentUser, db: Db) -> EmailRecord:
    """A new template, as a draft."""
    document = checked(body.document, "draft")
    template = EmailTemplate(name=name_of(document), type_key=body.type_key, document=document)
    audit.stamp_created(template, me)
    db.add(template)
    audit.record_activity(db, template, Action.CREATED, me, to_status=Status.DRAFT)
    db.commit()
    return EmailRecord.model_validate(template)


@router.delete("/{email_id}", status_code=204)
def delete(template: LiveEmail, me: CurrentUser, db: Db) -> None:
    """Into the trash; ``409`` while it is published."""
    audit.soft_delete(db, template, me, status=template.status)
    db.commit()


@router.post("/{email_id}/restore")
def restore(email_id: UUID, me: CurrentUser, db: Db) -> EmailRecord:
    """Out of the trash, as it was."""
    template = find_email(db, email_id, deleted=True)
    audit.restore(db, template, me, status=template.status)
    db.commit()
    return EmailRecord.model_validate(template)


# ── The editor ───────────────────────────────────────────────────────────────


@router.get("/{email_id}")
def read(template: LiveEmail) -> EmailRecord:
    """The live document, the draft, and when they were saved."""
    return EmailRecord.model_validate(template)


@router.put("/{email_id}/draft")
def save_draft(template: LiveEmail, body: Draft, me: CurrentUser, db: Db) -> Saved:
    """An autosave or a manual save. Readers and the mailer still get the live document."""
    document = checked(body.document, "draft")
    write = (
        update(EmailTemplate)
        .where(EmailTemplate.id == template.id, EmailTemplate.live())
        .values(
            draft_document=document,
            name=name_of(document),
            saved_at=func.now(),
            updated_by_id=me.id,
        )
        .returning(EmailTemplate.saved_at)
    )
    # The editor sends back the saved_at it last saw. Written only if the row
    # still has it, so of two saves at the same moment one wins and the other
    # is told: 409. A save that names no saved_at could overwrite anything, so
    # it is refused too. "Keep mine" sends force.
    if not body.force:
        if body.expected_saved_at is None:
            raise ConflictError(STALE)
        write = write.where(EmailTemplate.saved_at == body.expected_saved_at)
    saved_at = db.scalar(write)
    if saved_at is None:
        raise ConflictError(STALE)
    if body.reason == SaveReason.MANUAL:
        revision = audit.record_revision(db, template, RevisionKind.MANUAL, document, me)
        audit.record_activity(
            db, template, Action.SAVED, me, details={"revision": str(revision.uuid)}
        )
    db.commit()
    return Saved(saved_at=saved_at)


@router.post("/{email_id}/publish")
def publish(email_id: UUID, body: Publish, me: CurrentUser, db: Db) -> Published:
    """The strict check, then the document goes live, as a new version."""
    # Locked: two publishes of one template take turns, so each gets its own version.
    template = find_email(db, email_id, for_update=True)
    document = checked(body.document, "publish")
    was = template.status
    retire_active_design(db, template, me)

    template.document = document
    template.draft_document = None
    template.name = name_of(document)
    template.status = Status.PUBLISHED
    template.version += 1
    template.saved_at = template.published_at = func.now()
    template.published_by = me
    audit.stamp_updated(template, me)

    revision = audit.record_revision(db, template, RevisionKind.PUBLISH, document, me)
    audit.record_activity(
        db,
        template,
        Action.PUBLISHED,
        me,
        from_status=was,
        to_status=Status.PUBLISHED,
        details={"revision": str(revision.uuid), "version": template.version},
    )
    db.commit()
    return Published(
        saved_at=template.saved_at, status=template.status, published_at=template.published_at
    )


def retire_active_design(db: Session, template: EmailTemplate, me: AppUser) -> None:
    """One active design per email type: the one before goes back to draft."""
    if template.type_key is None:
        return
    retired = db.scalars(
        update(EmailTemplate)
        .where(
            EmailTemplate.type_key == template.type_key,
            EmailTemplate.status == Status.PUBLISHED,
            EmailTemplate.live(),
            EmailTemplate.id != template.id,
        )
        .values(status=Status.DRAFT, updated_by_id=me.id)
        .returning(EmailTemplate)
    ).all()
    for row in retired:
        audit.record_activity(
            db,
            row,
            Action.UNPUBLISHED,
            me,
            from_status=Status.PUBLISHED,
            to_status=Status.DRAFT,
            details={"replaced_by": str(template.uuid)},
        )


@router.post("/{email_id}/unpublish")
def unpublish(template: LiveEmail, me: CurrentUser, db: Db) -> StatusChanged:
    """Back to a draft, so it is no longer sent. The document is not written, so
    ``saved_at`` stays: an editor's open copy is still current."""
    if template.status == Status.PUBLISHED:
        template.status = Status.DRAFT
        audit.stamp_updated(template, me)
        audit.record_activity(
            db,
            template,
            Action.UNPUBLISHED,
            me,
            from_status=Status.PUBLISHED,
            to_status=Status.DRAFT,
        )
        db.commit()
    return StatusChanged(saved_at=template.saved_at, status=template.status)


@router.post("/{email_id}/send")
def send(template: LiveEmail, body: Send, request: Request) -> dict[str, Any]:
    """What your mailer does, rendered from the live document. Answers with the
    email instead of sending it."""
    # A draft is never sent.
    if template.status != Status.PUBLISHED:
        raise ConflictError("Only a published template is sent.")
    origin = str(request.base_url).rstrip("/")
    email = render_email(
        template.document,
        data=body.data,
        locale="en",
        # A mail client has no page to resolve a path against: every URL is absolute.
        asset_url=lambda key: f"{origin}/api/uploads/{key}",
    )
    # Here a real project hands subject, html and text to its mailer. A
    # variable with no value renders empty and is listed in `missing`.
    return {
        "subject": email.subject,
        "html": email.html,
        "text": email.text,
        "missing": email.missing,
    }
