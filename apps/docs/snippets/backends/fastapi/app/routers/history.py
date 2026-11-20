"""A document's history: its revisions (what it said) and its activity (what
happened to it)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import defer

from app import documents
from app.audit import find, timeline
from app.deps import CurrentUser, SessionDep, current_user
from app.errors import NotFoundError
from app.kinds import DocumentKind
from app.schemas import ActivityOut, NamedRevision, RevisionOut, RevisionSummary

router = APIRouter(prefix="/api/{kind}/{document_id}", dependencies=[Depends(current_user)])


@router.get("/revisions")
def list_revisions(kind: DocumentKind, document_id: UUID, db: SessionDep) -> list[RevisionSummary]:
    """For the editor's ``loadRevisions``: newest first, without the documents."""
    row = find(db, kind.model, document_id)
    revision = kind.revision
    revisions = db.scalars(
        select(revision)
        .where(revision.document_id == row.id)
        .options(defer(revision.document))
        .order_by(revision.created_at.desc(), revision.id.desc())
        .limit(100)
    )
    return [RevisionSummary.model_validate(each) for each in revisions]


@router.get("/revisions/{revision_id}")
def read_revision(
    kind: DocumentKind, document_id: UUID, revision_id: UUID, db: SessionDep
) -> RevisionOut:
    row = find(db, kind.model, document_id)
    revision = db.scalar(
        select(kind.revision).where(
            kind.revision.document_id == row.id, kind.revision.uuid == revision_id
        )
    )
    if revision is None:
        raise NotFoundError("There is no such revision.")
    return RevisionOut.model_validate(revision)


@router.post("/revisions", status_code=201)
def save_revision(
    kind: DocumentKind, document_id: UUID, body: NamedRevision, db: SessionDep, user: CurrentUser
) -> RevisionSummary:
    revision = documents.save_revision(db, kind, document_id, body, user)
    db.commit()
    return RevisionSummary.model_validate(revision)


@router.get("/activity")
def activity(
    kind: DocumentKind,
    document_id: UUID,
    db: SessionDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[ActivityOut]:
    """Your timeline: who did what, and when."""
    row = find(db, kind.model, document_id)
    return [ActivityOut.model_validate(line) for line in timeline(db, row, limit)]
