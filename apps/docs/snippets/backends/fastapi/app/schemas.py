"""What the routes take and what they answer. Answers are read from the rows;
a row's ``uuid`` is its ``id`` here, and people are ``{ id, name }`` or null."""

from datetime import date, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import AliasPath, AwareDatetime, BaseModel, ConfigDict, Field, StrictBool

from app.models import Delivery, PopupEvent

# ── Requests ────────────────────────────────────────────────────────────────


class SaveReason(StrEnum):
    AUTOSAVE = "autosave"
    MANUAL = "manual"
    PUBLISH = "publish"


class NewDocument(BaseModel):
    #: The back office sends a starter document.
    document: Any
    #: An email's type: its variables.
    type_key: str | None = Field(default=None, max_length=60)
    #: An article's address, chosen when it is made.
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,200}$")
    locale: str | None = Field(default=None, pattern=r"^[a-z]{2}(-[A-Z]{2})?$")


class DraftSave(BaseModel):
    document: Any
    reason: SaveReason = SaveReason.AUTOSAVE
    #: The ``saved_at`` the editor last saw. Another one on the row, or none
    #: without ``force``, is a 409.
    expected_saved_at: AwareDatetime | None = None
    #: "Keep mine": save over whatever is there.
    force: bool = False


class Publish(BaseModel):
    document: Any
    #: An article goes live then, if it is later than now.
    scheduled_at: AwareDatetime | None = None


class NamedRevision(BaseModel):
    document: Any
    label: str | None = Field(default=None, max_length=120)


class Fragment(BaseModel):
    roots: list[str]
    nodes: dict[str, Any]


class NewSection(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    fragment: Fragment


class Submission(BaseModel):
    """What FormView's onSubmit sends: its ``values`` as ``answers``, and the trap."""

    answers: dict[str, Any] = {}
    locale: str | None = Field(default=None, max_length=10)
    trap: str = ""


class Triage(BaseModel):
    """Your inbox's change to a response; a field left out is kept."""

    status: str | None = Field(default=None, min_length=1, max_length=30)
    note: str | None = None


class NewCardIssue(BaseModel):
    """Who a card is for, what is printed on it, and how it reaches them."""

    #: Your member's id, as your system knows it.
    member_ref: str = Field(min_length=1, max_length=120)
    #: The member's fields: { "member.name": "Arben Hoxha" }.
    data: dict[str, Any]
    delivery: Delivery = Delivery.PRINT
    valid_until: date | None = None


class Revocation(BaseModel):
    reason: str | None = Field(default=None, max_length=200)


class PopupEventIn(BaseModel):
    """What PopupView's onEvent sends."""

    event: PopupEvent


class PopupValues(BaseModel):
    """What PopupView's onSubmit sends: the inputs' values, and the page they were on."""

    values: dict[str, Any] = {}
    path: str | None = Field(default=None, max_length=500)
    locale: str | None = Field(default=None, max_length=10)


class Pause(BaseModel):
    #: True takes the popup off the site; false puts it back.
    paused: StrictBool


# ── Answers ─────────────────────────────────────────────────────────────────


class Answer(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Person(Answer):
    id: UUID = Field(validation_alias="uuid")
    name: str


class Audit(Answer):
    created_at: datetime
    created_by: Person | None
    updated_at: datetime
    updated_by: Person | None
    deleted_at: datetime | None
    deleted_by: Person | None


class DocumentOut(Audit):
    """A whole document row: what the editor's ``reload`` reads."""

    id: UUID = Field(validation_alias="uuid")
    name: str
    status: str
    document: dict[str, Any]
    draft_document: dict[str, Any] | None
    saved_at: datetime
    version: int
    published_at: datetime | None
    published_by: Person | None
    # Each builder's own; null for the others.
    type_key: str | None = None
    slug: str | None = None
    locale: str | None = None
    scheduled_at: datetime | None = None
    response_count: int | None = None
    format: str | None = None
    width_mm: float | None = None
    height_mm: float | None = None
    sides: int | None = None
    type: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    priority: int | None = None


class ListedDocument(Answer):
    id: UUID = Field(validation_alias="uuid")
    name: str
    status: str
    saved_at: datetime
    updated_at: datetime
    updated_by: Person | None


class Page(Answer):
    items: list[ListedDocument]
    total: int


class Saved(Answer):
    saved_at: datetime


class StatusChanged(Answer):
    saved_at: datetime
    status: str


class Published(StatusChanged):
    published_at: datetime | None
    #: An article's, when it waits for it.
    scheduled_at: datetime | None = None


class RevisionSummary(Answer):
    id: UUID = Field(validation_alias="uuid")
    kind: str
    label: str | None
    version: int
    created_at: datetime
    #: The editor shows the name.
    author: str | None = Field(default=None, validation_alias=AliasPath("created_by", "name"))


class RevisionOut(Answer):
    document: dict[str, Any]


class ActivityOut(Answer):
    id: UUID = Field(validation_alias="uuid")
    action: str
    from_status: str | None
    to_status: str | None
    details: dict[str, Any]
    actor: Person | None
    created_at: datetime


class SectionOut(Answer):
    id: UUID = Field(validation_alias="uuid")
    name: str
    fragment: dict[str, Any]


class Uploaded(Answer):
    key: str
    url: str
    width: int | None
    height: int | None
    mime: str
    size: int
    name: str


class PublicForm(Answer):
    document: dict[str, Any]


class Received(Answer):
    #: Null when the trap was filled: a bot learns nothing.
    id: UUID | None


class ResponseOut(Audit):
    id: UUID = Field(validation_alias="uuid")
    form_version: int
    answers: dict[str, Any]
    locale: str | None
    status: str
    note: str


class ResponseLine(Answer):
    id: UUID
    title: str
    when: datetime
    status: str


class ResponseSummary(Answer):
    """The form editor's Responses tab."""

    total: int
    this_week: int
    latest: list[ResponseLine]


class CardIssueOut(Audit):
    """A card made out to a member. ``design`` is the design's public id."""

    id: UUID = Field(validation_alias="uuid")
    design: UUID = Field(validation_alias=AliasPath("card_design", "uuid"))
    design_version: int
    member_ref: str
    number: str
    data: dict[str, Any]
    status: str
    delivery: str
    valid_until: date | None
    printed_at: datetime | None
    revoked_at: datetime | None
    revoked_by: Person | None
    revoke_reason: str | None


class IssuedCard(CardIssueOut):
    """What issuing answers: the card, and its document as it is printed."""

    #: The design with this member's data written in, for the renderer or the printer.
    document: dict[str, Any] = {}


class CardIssuePage(Answer):
    items: list[CardIssueOut]
    total: int


class PublicPopup(Answer):
    """A popup as your site gets it: PopupView draws the document, shouldShow decides."""

    id: UUID = Field(validation_alias="uuid")
    version: int
    document: dict[str, Any]


class PopupStatus(Answer):
    status: str
