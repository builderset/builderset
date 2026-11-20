"""The library every builder shares: saved sections, and uploaded files."""

import hashlib
from typing import Annotated
from uuid import UUID

import fastapi
from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import storage
from app.audit import find, record_activity, soft_delete, stamp
from app.deps import CurrentUser, SessionDep, current_user
from app.errors import NotFoundError, TooLargeError, UnsupportedTypeError
from app.kinds import LibraryKind
from app.models import Action, Media, MediaKind, SavedSection, User
from app.schemas import NewSection, SectionOut, Uploaded

router = APIRouter(prefix="/api", dependencies=[Depends(current_user)])

# ── Saved sections ──────────────────────────────────────────────────────────


@router.get("/{kind}/sections")
def list_sections(kind: LibraryKind, db: SessionDep) -> list[SectionOut]:
    """For the editor's ``loadSections``: this builder's, by name."""
    sections = db.scalars(
        select(SavedSection)
        .where(SavedSection.kit == kind.kit, SavedSection.live())
        .order_by(SavedSection.name)
    )
    return [SectionOut.model_validate(section) for section in sections]


@router.post("/{kind}/sections", status_code=201)
def save_section(
    kind: LibraryKind, body: NewSection, db: SessionDep, user: CurrentUser
) -> SectionOut:
    section = SavedSection(kit=kind.kit, name=body.name, fragment=body.fragment.model_dump())
    stamp(section, user)
    db.add(section)
    record_activity(db, section, Action.CREATED, user)
    db.commit()
    return SectionOut.model_validate(section)


@router.delete("/{kind}/sections/{section_id}", status_code=204)
def delete_section(kind: LibraryKind, section_id: UUID, db: SessionDep, user: CurrentUser) -> None:
    """Hidden from the editor's list; the documents that used it keep their copy."""
    section = find(db, SavedSection, section_id)
    if section.kit != kind.kit:
        raise NotFoundError("There is no such saved section.")
    soft_delete(db, section, user)
    db.commit()


# ── Uploads ─────────────────────────────────────────────────────────────────


def _media_row(
    db: Session, data: bytes, file_type: storage.FileType, name: str, user: User
) -> Media:
    """The file's row. The same bytes uploaded again are the row already there."""
    digest = hashlib.sha256(data).hexdigest()
    same = db.scalar(select(Media).where(Media.sha256 == digest, Media.live()))
    if same is not None:
        return same
    # width and height stay empty here: Pillow's Image.open(…).size reads them.
    media = Media(
        key=storage.store(data, file_type),
        kind=file_type.kind,
        mime=file_type.mime,
        size=len(data),
        name=name,
        sha256=digest,
    )
    stamp(media, user)
    db.add(media)
    record_activity(db, media, Action.CREATED, user)
    return media


@router.post("/uploads", status_code=201)
def upload(
    file: UploadFile,
    kind: Annotated[MediaKind, fastapi.Form()],
    db: SessionDep,
    user: CurrentUser,
) -> Uploaded:
    """For the editor's ``upload``: the file's key, and where to show it from."""
    data = file.file.read(storage.MAX_UPLOAD_BYTES + 1)
    if len(data) > storage.MAX_UPLOAD_BYTES:
        raise TooLargeError("The file is larger than 10 MB.")
    file_type = storage.sniff(data)
    if file_type is None or file_type.kind != kind:
        raise UnsupportedTypeError("This kind of file is not accepted.")
    media = _media_row(db, data, file_type, file.filename or "upload", user)
    db.commit()
    return Uploaded(
        key=media.key,
        url=storage.url_of(media.key),
        width=media.width,
        height=media.height,
        mime=media.mime,
        size=media.size,
        name=media.name,
    )
