"""Images for emails: the editor uploads them, and documents hold their keys."""

from typing import Annotated, Any

from fastapi import APIRouter, Form, UploadFile
from fastapi.responses import FileResponse

from app.errors import NotFoundError, TooLargeError, UnsupportedMediaError
from app.storage import MAX_UPLOAD_BYTES, image_type_of, store_image, stored_image

router = APIRouter(prefix="/api/uploads", tags=["uploads"])


@router.post("", status_code=201)
def upload(file: UploadFile, kind: Annotated[str, Form()]) -> dict[str, Any]:
    """An image for an email, as multipart ``file`` and ``kind``."""
    if kind != "image":
        raise UnsupportedMediaError("Send one image, as `file`.")
    data = file.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise TooLargeError("The file is too large.")
    image_type = image_type_of(data)
    if image_type is None:
        raise UnsupportedMediaError("Only PNG, JPEG and GIF images.")
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


@router.get("/{key:path}")
def download(key: str) -> FileResponse:
    """The stored file. A key never changes, so it is cached for good."""
    stored = stored_image(key)
    if stored is None:
        raise NotFoundError("There is no such file.")
    path, mime = stored
    return FileResponse(
        path, media_type=mime, headers={"cache-control": "public, max-age=31536000, immutable"}
    )
