"""The editor's routes, written once for the three builders and mounted three
times: /api/emails, /api/articles, /api/forms. What differs between them is
the small table at the bottom."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import AwareDatetime, BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.checks import EMAIL_TYPES, InvalidDocumentError, Kit, checked
from app.db import get_session
from app.models import Article, EmailTemplate, Form

Db = Annotated[Session, Depends(get_session)]
Model = type[EmailTemplate] | type[Article] | type[Form]


@dataclass(frozen=True)
class Editor:
    id: int
    #: Publishing is its own permission: a draft and a live page are different trust.
    can_publish: bool


def current_editor(request: Request) -> Editor:
    """Who is signed in. Your auth middleware (a session, a JWT) puts them on
    ``request.state.user``; who may edit is your rule."""
    user = getattr(request.state, "user", None)
    if not isinstance(user, Editor):
        raise HTTPException(401, "Sign in to edit.")
    return user


Me = Annotated[Editor, Depends(current_editor)]


def now_ms() -> datetime:
    """Now, to the millisecond: the precision of the column and of JavaScript."""
    now = datetime.now(UTC)
    return now.replace(microsecond=now.microsecond // 1000 * 1000)


def iso(value: datetime | None) -> str | None:
    return value.isoformat(timespec="milliseconds") if value else None


class NewDocument(BaseModel):
    #: The back office sends a starter document.
    document: Any
    #: An email's type: its variables.
    type_key: str | None = None
    #: An article's address, chosen when it is made.
    slug: str | None = Field(default=None, pattern=r"^[a-z0-9-]{1,200}$")
    locale: str | None = Field(default=None, pattern=r"^[a-z]{2}(-[A-Z]{2})?$")


class Draft(BaseModel):
    document: Any
    reason: str | None = None
    expected_saved_at: AwareDatetime | None = None
    force: bool = False


class Publish(BaseModel):
    document: Any
    scheduled_at: AwareDatetime | None = None


@dataclass(frozen=True)
class Kind:
    kit: Kit
    model: Model
    noun: str
    #: The columns the list shows.
    listed: tuple[str, ...]
    #: Copies of the live document's meta, written with it, for lists and search.
    copies: Callable[[dict[str, Any]], dict[str, Any]]
    #: The columns a new row takes from the request; None when it lacks them.
    create: Callable[[NewDocument, dict[str, Any], Editor], dict[str, Any] | None]
    #: Where unpublishing leaves it.
    unpublished: str
    #: Whether ``scheduled_at`` may put it live later.
    schedules: bool = False


def record(row: EmailTemplate | Article | Form) -> dict[str, Any]:
    """The record as the editor reads it."""
    return {
        "id": row.id,
        "status": row.status,
        "document": row.document,
        "draft_document": row.draft_document,
        "saved_at": iso(row.saved_at),
        "published_at": iso(row.published_at),
    }


def document_router(kind: Kind) -> APIRouter:
    router = APIRouter(dependencies=[Depends(current_editor)])
    model = kind.model

    def find(db: Session, document_id: int) -> EmailTemplate | Article | Form:
        row = db.get(model, document_id)
        if row is None:
            raise HTTPException(404, f"There is no such {kind.noun}.")
        return row

    def conflict() -> HTTPException:
        return HTTPException(409, f"Someone else saved this {kind.noun} since you opened it.")

    def type_key(row: object) -> str | None:
        return getattr(row, "type_key", None)

    @router.get("")
    def list_documents(db: Db) -> list[dict[str, Any]]:
        """The list, newest first: its own columns, never the documents."""
        columns = [getattr(model, name) for name in kind.listed]
        rows = db.execute(select(*columns).order_by(model.saved_at.desc()).limit(200))
        return [dict(row._mapping) for row in rows]

    @router.post("", status_code=201)
    def create(body: NewDocument, db: Db, me: Me) -> dict[str, Any]:
        """A new document, as a draft."""
        document = checked(kind.kit, body.document, "draft", type_key=body.type_key)
        columns = kind.create(body, document, me)
        if columns is None:
            raise HTTPException(400, f"A new {kind.noun} needs a slug and a locale.")
        row = model(**{**kind.copies(document), **columns}, document=document, saved_at=now_ms())
        db.add(row)
        try:
            db.commit()
        except IntegrityError:
            raise HTTPException(409, "That address is taken.") from None
        return record(row)

    @router.get("/{document_id}")
    def read(document_id: int, db: Db) -> dict[str, Any]:
        """What ``reload`` reads: the live document, the draft, and ``saved_at``."""
        return record(find(db, document_id))

    # region draft
    @router.put("/{document_id}/draft")
    def save_draft(document_id: int, body: Draft, db: Db) -> dict[str, Any]:
        """An autosave or a manual save. Readers still get the live document."""
        row = find(db, document_id)
        # The editor sends back the saved_at it last saw. Another one here means
        # someone else saved in between; "keep mine" sends force.
        if not body.force and body.expected_saved_at and body.expected_saved_at != row.saved_at:
            raise conflict()
        document = checked(kind.kit, body.document, "draft", type_key=type_key(row))
        saved_at = now_ms()
        # Written only if the row is still the one read above, so two saves at
        # the same moment cannot both win.
        written = db.execute(
            update(model)
            .where(model.id == row.id, model.saved_at == row.saved_at)
            .values(draft_document=document, saved_at=saved_at)
            .returning(model.id)
        ).scalar_one_or_none()
        if written is None:
            raise conflict()
        db.commit()
        return {"saved_at": iso(saved_at)}

    # endregion

    # region publish
    @router.post("/{document_id}/publish")
    def publish(document_id: int, body: Publish, db: Db, me: Me) -> dict[str, Any]:
        """The strict check, then the document goes live."""
        if not me.can_publish:
            raise HTTPException(403, "You may not publish.")
        row = find(db, document_id)
        document = checked(kind.kit, body.document, "publish", type_key=type_key(row))
        now = now_ms()
        later = body.scheduled_at if kind.schedules else None
        if later and later <= now:
            later = None
        if isinstance(row, EmailTemplate) and row.type_key:
            # One active design per email type: the one before steps down.
            db.execute(
                update(EmailTemplate)
                .where(
                    EmailTemplate.type_key == row.type_key,
                    EmailTemplate.status == "published",
                    EmailTemplate.id != row.id,
                )
                .values(status="draft", saved_at=now)
            )
        for column, value in kind.copies(document).items():
            setattr(row, column, value)
        row.document = document
        row.draft_document = None
        # A scheduled article waits for your job to set it live at scheduled_at.
        row.status = "scheduled" if later else "published"
        if isinstance(row, Article):
            row.scheduled_at = later
        row.published_at = None if later else now
        row.saved_at = now
        row.version += 1
        try:
            db.commit()
        except IntegrityError:
            # Another form already lives at this address.
            raise InvalidDocumentError([{"code": "meta.slugTaken", "path": "meta.slug"}]) from None
        return {
            "saved_at": iso(row.saved_at),
            "status": row.status,
            "published_at": iso(row.published_at),
            "scheduled_at": iso(later),
        }

    # endregion

    @router.post("/{document_id}/unpublish")
    def unpublish(document_id: int, db: Db, me: Me) -> dict[str, Any]:
        """Readers no longer get it; the document is kept."""
        if not me.can_publish:
            raise HTTPException(403, "You may not publish.")
        row = find(db, document_id)
        row.status = kind.unpublished
        row.saved_at = now_ms()
        db.commit()
        return {"saved_at": iso(row.saved_at), "status": row.status}

    return router


# region kinds
# ── The three kinds ─────────────────────────────────────────────────────────


def _new_email(body: NewDocument, _document: dict[str, Any], me: Editor) -> dict[str, Any]:
    # Only a type the project has: its key picks the variables checked.
    known = body.type_key if body.type_key in EMAIL_TYPES else None
    return {"type_key": known, "created_by": me.id}


def _new_article(body: NewDocument, _document: dict[str, Any], me: Editor) -> dict[str, Any] | None:
    if not body.slug or not body.locale:
        return None
    return {"slug": body.slug, "locale": body.locale, "author_id": me.id}


def _new_form(_body: NewDocument, document: dict[str, Any], me: Editor) -> dict[str, Any]:
    # The slug is unique and required, and a new form often has none yet: a
    # placeholder holds its place until the form is published with its own.
    slug = document["meta"]["slug"] or f"draft-{uuid.uuid4()}"
    return {"slug": slug, "created_by": me.id}


def _article_copies(document: dict[str, Any]) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": cover.get("media", {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


KINDS: dict[str, Kind] = {
    "emails": Kind(
        kit="email",
        model=EmailTemplate,
        noun="email template",
        listed=("id", "name", "type_key", "status", "saved_at", "published_at"),
        copies=lambda document: {"name": document["meta"]["name"]},
        create=_new_email,
        unpublished="draft",
    ),
    "articles": Kind(
        kit="article",
        model=Article,
        noun="article",
        listed=("id", "slug", "locale", "title", "status", "saved_at", "published_at"),
        copies=_article_copies,
        create=_new_article,
        unpublished="draft",
        schedules=True,
    ),
    "forms": Kind(
        kit="form",
        model=Form,
        noun="form",
        listed=("id", "slug", "name", "status", "response_count", "saved_at", "published_at"),
        copies=lambda document: {
            "name": document["meta"]["name"],
            "slug": document["meta"]["slug"],
        },
        create=_new_form,
        # A closed form keeps its link and shows its closed message.
        unpublished="closed",
    ),
}
# endregion
