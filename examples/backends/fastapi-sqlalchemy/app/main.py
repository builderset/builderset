"""The routes the editor's REST host calls, for email templates.

Run it: ``uv run uvicorn app.main:app --reload``.
"""

from datetime import UTC, datetime
from typing import Annotated, Any

from builderset.email import render_email
from fastapi import Depends, FastAPI, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db import get_session
from app.emails import InvalidDocumentError, checked
from app.models import EmailTemplate
from app.uploads import MAX_UPLOAD_BYTES, image_type_of, store_image, stored_image

app = FastAPI(title="Builderset email templates")
Db = Annotated[Session, Depends(get_session)]


@app.exception_handler(InvalidDocumentError)
def refused(_request: Request, error: InvalidDocumentError) -> JSONResponse:
    # The editor shows each issue on the block it belongs to.
    return JSONResponse({"issues": error.issues}, status_code=422)


def find(db: Session, email_id: int) -> EmailTemplate:
    row = db.get(EmailTemplate, email_id)
    if row is None:
        raise HTTPException(404, "There is no such email template.")
    return row


def conflict() -> HTTPException:
    return HTTPException(409, "Someone else saved this template since you opened it.")


def record(row: EmailTemplate) -> dict[str, Any]:
    """The record as the editor reads it."""
    return {
        "id": row.id,
        "name": row.name,
        "status": row.status,
        "document": row.document,
        "draft_document": row.draft_document,
        "saved_at": row.saved_at.isoformat(),
        "published_at": row.published_at.isoformat() if row.published_at else None,
    }


class NewTemplate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    #: The back office sends a starter document.
    document: Any


class Draft(BaseModel):
    document: Any
    expected_saved_at: datetime | None = None
    force: bool = False


class Publish(BaseModel):
    document: Any


class Send(BaseModel):
    data: dict[str, Any] = {}


@app.post("/api/emails", status_code=201)
def create(body: NewTemplate, db: Db) -> dict[str, Any]:
    """A new template, as a draft."""
    row = EmailTemplate(
        name=body.name, document=checked(body.document, "draft"), saved_at=datetime.now(UTC)
    )
    db.add(row)
    db.commit()
    return record(row)


@app.get("/api/emails/{email_id}")
def read(email_id: int, db: Db) -> dict[str, Any]:
    """The live document, the draft, and when they were saved."""
    return record(find(db, email_id))


@app.put("/api/emails/{email_id}/draft")
def save_draft(email_id: int, body: Draft, db: Db) -> dict[str, Any]:
    """An autosave or a manual save. Readers still get the live document."""
    row = find(db, email_id)
    # The editor sends back the saved_at it last saw. Another one here means
    # someone else saved in between; "keep mine" sends force.
    if not body.force and body.expected_saved_at and body.expected_saved_at != row.saved_at:
        raise conflict()
    document = checked(body.document, "draft")
    saved_at = datetime.now(UTC)
    # Written only if the row is still the one checked above, so two saves at
    # the same moment cannot both win.
    written = db.execute(
        update(EmailTemplate)
        .where(EmailTemplate.id == row.id, EmailTemplate.saved_at == row.saved_at)
        .values(draft_document=document, saved_at=saved_at)
        .returning(EmailTemplate.id)
    ).scalar_one_or_none()
    if written is None:
        raise conflict()
    db.commit()
    return {"saved_at": saved_at.isoformat()}


@app.post("/api/emails/{email_id}/publish")
def publish(email_id: int, body: Publish, db: Db) -> dict[str, Any]:
    """The strict check, then the document goes live."""
    row = find(db, email_id)
    now = datetime.now(UTC)
    row.document = checked(body.document, "publish")
    row.draft_document = None
    row.status = "published"
    row.saved_at = row.published_at = now
    db.commit()
    return {"saved_at": now.isoformat(), "status": row.status, "published_at": now.isoformat()}


@app.post("/api/emails/{email_id}/unpublish")
def unpublish(email_id: int, db: Db) -> dict[str, Any]:
    """Back to a draft, so it is no longer sent."""
    row = find(db, email_id)
    row.status = "draft"
    row.saved_at = datetime.now(UTC)
    db.commit()
    return {"saved_at": row.saved_at.isoformat(), "status": row.status}


@app.post("/api/emails/{email_id}/send")
def send(email_id: int, body: Send, request: Request, db: Db) -> dict[str, Any]:
    """What your mailer does, rendered from the live document. Answers with the
    email instead of sending it."""
    row = find(db, email_id)
    # A draft is never sent.
    if row.status != "published":
        raise HTTPException(409, "Only a published template is sent.")
    origin = str(request.base_url).rstrip("/")
    email = render_email(
        row.document,
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


@app.post("/api/uploads", status_code=201)
def upload(file: UploadFile, kind: Annotated[str, Form()]) -> dict[str, Any]:
    """An image for an email, as multipart ``file`` and ``kind``."""
    if kind != "image":
        raise HTTPException(415, "Send one image, as `file`.")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "The file is too large.")
    image_type = image_type_of(data)
    if image_type is None:
        raise HTTPException(415, "Only PNG, JPEG and GIF images.")
    key = store_image(data, image_type)
    # A real project also reads the width and height (with Pillow, say), so
    # the editor can reserve the image's space before it loads.
    return {
        "key": key,
        "url": f"/api/uploads/{key}",
        "mime": image_type.mime,
        "size": len(data),
        "name": file.filename,
    }


@app.get("/api/uploads/{key:path}")
def download(key: str) -> FileResponse:
    """The stored file. A key never changes, so it is cached for good."""
    stored = stored_image(key)
    if stored is None:
        raise HTTPException(404)
    path, mime = stored
    return FileResponse(
        path, media_type=mime, headers={"cache-control": "public, max-age=31536000, immutable"}
    )
