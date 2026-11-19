"""Uploaded files on the local disk, in uploads/.

A real project keeps them in S3 or similar, often sent there by the browser
with a pre-signed URL. Only this file changes: a document holds a file's key,
never its URL.
"""

import re
import uuid
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parent.parent / "uploads"
MAX_UPLOAD_BYTES = 5 * 1024 * 1024


class ImageType(NamedTuple):
    mime: str
    extension: str
    signature: bytes


#: The images an email can show, known by their first bytes, never by the file's name.
IMAGE_TYPES = (
    ImageType("image/png", "png", b"\x89PNG"),
    ImageType("image/jpeg", "jpg", b"\xff\xd8\xff"),
    ImageType("image/gif", "gif", b"GIF8"),
)

KEY = re.compile(r"emails/[0-9a-f-]{36}\.(\w+)")


def image_type_of(data: bytes) -> ImageType | None:
    return next((kind for kind in IMAGE_TYPES if data.startswith(kind.signature)), None)


def store_image(data: bytes, kind: ImageType) -> str:
    """Stores the image under a key of ours: a client's file name never becomes a path."""
    key = f"emails/{uuid.uuid4()}.{kind.extension}"
    path = ROOT / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def stored_image(key: str) -> tuple[Path, str] | None:
    """The file and its type for a key, or None. Only keys ``store_image`` makes are read."""
    match = KEY.fullmatch(key)
    kind = next((kind for kind in IMAGE_TYPES if match and kind.extension == match[1]), None)
    path = ROOT / key
    return (path, kind.mime) if kind and path.is_file() else None
