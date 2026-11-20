"""The editor's routes for a document, the same for /api/emails, /api/articles
and /api/forms. Each one does the HTTP part; app.documents does the write."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import defer

from app import documents
from app.audit import find
from app.deps import CurrentUser, SessionDep, current_user
from app.kinds import DocumentKind
from app.models import Status
from app.schemas import (
    DocumentOut,
    DraftSave,
    ListedDocument,
    NewDocument,
    Page,
    Publish,
    Published,
    Saved,
    StatusChanged,
)

router = APIRouter(prefix="/api/{kind}", dependencies=[Depends(current_user)])


@router.get("")
def list_documents(
    kind: DocumentKind,
    db: SessionDep,
    status: Status | None = None,
    q: str | None = None,
    deleted: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Page:
    """Your list, newest change first; ``deleted=true`` is the trash."""
    model = kind.model
    where = [model.deleted_at.is_not(None) if deleted else model.live()]
    if status is not None:
        where.append(model.status == status)
    if q:
        where.append(model.name.icontains(q, autoescape=True))
    total = db.scalar(select(func.count()).select_from(model).where(*where))
    rows = db.scalars(
        select(model)
        .where(*where)
        # A list never reads the documents.
        .options(defer(model.document), defer(model.draft_document))
        .order_by(model.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return Page(items=[ListedDocument.model_validate(row) for row in rows], total=total or 0)


@router.post("", status_code=201)
def create(kind: DocumentKind, body: NewDocument, db: SessionDep, user: CurrentUser) -> DocumentOut:
    row = documents.create_document(db, kind, body, user)
    db.commit()
    return DocumentOut.model_validate(row)


@router.get("/{document_id}")
def read(kind: DocumentKind, document_id: UUID, db: SessionDep) -> DocumentOut:
    """What the editor's ``reload`` reads: the live document, the draft, ``saved_at``."""
    return DocumentOut.model_validate(find(db, kind.model, document_id))


@router.put("/{document_id}/draft")
def save_draft(
    kind: DocumentKind, document_id: UUID, body: DraftSave, db: SessionDep, user: CurrentUser
) -> Saved:
    saved_at = documents.save_draft(db, kind, document_id, body, user)
    db.commit()
    return Saved(saved_at=saved_at)


@router.post("/{document_id}/publish")
def publish(
    kind: DocumentKind, document_id: UUID, body: Publish, db: SessionDep, user: CurrentUser
) -> Published:
    row = documents.publish(db, kind, document_id, body, user)
    db.commit()
    return Published.model_validate(row)


@router.post("/{document_id}/unpublish")
def unpublish(
    kind: DocumentKind, document_id: UUID, db: SessionDep, user: CurrentUser
) -> StatusChanged:
    row = documents.unpublish(db, kind, document_id, user)
    db.commit()
    return StatusChanged.model_validate(row)


@router.delete("/{document_id}", status_code=204)
def delete(kind: DocumentKind, document_id: UUID, db: SessionDep, user: CurrentUser) -> None:
    """To the trash: 409 while it is live."""
    documents.delete_document(db, kind, document_id, user)
    db.commit()


@router.post("/{document_id}/restore")
def restore(
    kind: DocumentKind, document_id: UUID, db: SessionDep, user: CurrentUser
) -> DocumentOut:
    """Out of the trash: 409 when its address was taken meanwhile."""
    row = documents.restore_document(db, kind, document_id, user)
    db.commit()
    return DocumentOut.model_validate(row)
