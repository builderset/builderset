"""A template's history: its revisions (what it said) and its activity (what
happened to it)."""

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from sqlalchemy import select

from app import audit
from app.checks import checked
from app.deps import CurrentUser, Db, LiveEmail
from app.errors import NotFoundError
from app.models import Action, Activity, EmailTemplateRevision, RevisionKind, SubjectType
from app.schemas import ActivityEntry, RevisionDocument, RevisionSummary

router = APIRouter(prefix="/api/emails/{email_id}", tags=["history"])


class NamedVersion(BaseModel):
    document: Any
    #: "Before the legal review".
    label: str | None = Field(default=None, max_length=120)


@router.get("/revisions")
def list_revisions(template: LiveEmail, db: Db) -> list[RevisionSummary]:
    """The editor's history list, newest first."""
    revisions = db.scalars(
        select(EmailTemplateRevision)
        .where(EmailTemplateRevision.email_template_id == template.id)
        .order_by(EmailTemplateRevision.created_at.desc(), EmailTemplateRevision.id.desc())
    )
    return [RevisionSummary.of(revision) for revision in revisions]


@router.get("/revisions/{revision_id}")
def read_revision(template: LiveEmail, revision_id: UUID, db: Db) -> RevisionDocument:
    """One revision's document, for the editor to show or restore."""
    revision = db.scalars(
        select(EmailTemplateRevision).where(
            EmailTemplateRevision.uuid == revision_id,
            # Only this template's: an id from another one is not found here.
            EmailTemplateRevision.email_template_id == template.id,
        )
    ).one_or_none()
    if revision is None:
        raise NotFoundError("There is no such revision of this template.")
    return RevisionDocument(document=revision.document)


@router.post("/revisions", status_code=201)
def save_revision(
    template: LiveEmail, body: NamedVersion, me: CurrentUser, db: Db
) -> RevisionSummary:
    """A named version, kept apart from the draft: the template itself is not changed."""
    document = checked(body.document, "draft")
    revision = audit.record_revision(
        db, template, RevisionKind.MANUAL, document, me, label=body.label
    )
    audit.record_activity(
        db,
        template,
        Action.SAVED,
        me,
        details={"revision": str(revision.uuid), "label": body.label},
    )
    db.commit()
    return RevisionSummary.of(revision)


@router.get("/activity")
def list_activity(
    template: LiveEmail, db: Db, limit: Annotated[int, Query(ge=1, le=200)] = 50
) -> list[ActivityEntry]:
    """The template's timeline, newest first."""
    entries = db.scalars(
        select(Activity)
        .where(
            Activity.subject_type == SubjectType.EMAIL_TEMPLATE,
            Activity.subject_id == template.id,
        )
        .order_by(Activity.created_at.desc(), Activity.id.desc())
        .limit(limit)
    )
    return [ActivityEntry.model_validate(entry) for entry in entries]
