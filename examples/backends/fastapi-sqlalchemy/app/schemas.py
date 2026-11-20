"""What the routes answer. A row's public ``uuid`` is its ``id`` here; the
internal ``id`` never leaves the server."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import Action, EmailTemplateRevision, RevisionKind, Status


class Answer(BaseModel):
    # Read from the ORM objects' attributes.
    model_config = ConfigDict(from_attributes=True)


class Person(Answer):
    """Someone named in an answer: ``created_by``, ``updated_by``, ``actor``."""

    id: UUID = Field(validation_alias="uuid")
    name: str


class EmailSummary(Answer):
    """A row of your list, or of the trash."""

    id: UUID = Field(validation_alias="uuid")
    name: str
    type_key: str | None
    status: Status
    saved_at: datetime
    updated_at: datetime
    updated_by: Person | None
    deleted_at: datetime | None
    deleted_by: Person | None


class EmailPage(BaseModel):
    items: list[EmailSummary]
    total: int


class EmailRecord(EmailSummary):
    """The template as the editor reloads it, with who did what."""

    document: dict[str, Any]
    draft_document: dict[str, Any] | None
    version: int
    published_at: datetime | None
    published_by: Person | None
    created_at: datetime
    created_by: Person | None


class Saved(BaseModel):
    saved_at: datetime


class StatusChanged(Saved):
    status: Status


class Published(StatusChanged):
    published_at: datetime | None


class RevisionSummary(BaseModel):
    id: UUID
    kind: RevisionKind
    label: str | None
    version: int
    created_at: datetime
    #: A name, as the editor's history list shows it.
    author: str | None

    @classmethod
    def of(cls, revision: EmailTemplateRevision) -> "RevisionSummary":
        author = revision.created_by
        return cls(
            id=revision.uuid,
            kind=revision.kind,
            label=revision.label,
            version=revision.version,
            created_at=revision.created_at,
            author=author.name if author else None,
        )


class RevisionDocument(BaseModel):
    document: dict[str, Any]


class ActivityEntry(Answer):
    id: UUID = Field(validation_alias="uuid")
    action: Action
    from_status: str | None
    to_status: str | None
    details: dict[str, Any]
    actor: Person | None
    created_at: datetime
