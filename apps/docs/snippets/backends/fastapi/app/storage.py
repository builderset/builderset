"""Uploaded files on the local disk, in uploads/. A real project keeps them in
S3 or similar; only this file changes, because a document holds a file's key,
never its URL."""

from datetime import UTC, datetime
from pathlib import Path
from typing import NamedTuple
from uuid import uuid4

from app.models import MediaKind

ROOT = Path("uploads")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class FileType(NamedTuple):
    mime: str
    extension: str
    kind: MediaKind
    signature: bytes


#: The files the editor takes, known by their first bytes, never by their name.
FILE_TYPES = (
    FileType("image/png", "png", MediaKind.IMAGE, b"\x89PNG\r\n\x1a\n"),
    FileType("image/jpeg", "jpg", MediaKind.IMAGE, b"\xff\xd8\xff"),
    FileType("image/gif", "gif", MediaKind.IMAGE, b"GIF8"),
    FileType("application/pdf", "pdf", MediaKind.FILE, b"%PDF-"),
)


def sniff(data: bytes) -> FileType | None:
    return next((kind for kind in FILE_TYPES if data.startswith(kind.signature)), None)


def store(data: bytes, file_type: FileType) -> str:
    """Keep the bytes under a new key of ours: a client's file name never
    becomes a path."""
    key = f"{datetime.now(UTC):%Y/%m}/{uuid4()}.{file_type.extension}"
    path = ROOT / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def url_of(key: str) -> str:
    """Where a browser gets the file: main.py serves uploads/ at this path."""
    return f"/api/uploads/{key}"
