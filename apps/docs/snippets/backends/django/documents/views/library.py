"""The library: the sections the editor saves to reuse, and uploads."""

import hashlib
import mimetypes
import uuid
from typing import Any
from uuid import UUID

from django.core.files.images import get_image_dimensions
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..audit import actor_of, record_activity, soft_delete, stamp
from ..errors import NotAccepted, Refused, TooLarge, find
from ..kinds import Kind
from ..models import Action, Media, MediaKind, SavedSection
from ..permissions import StaffView
from ..serializers import MediaSerializer, SectionSerializer
from .common import body_of

# ── Saved sections ───────────────────────────────────────────────────────────


def section_issues(name: Any, fragment: Any) -> list[dict[str, str]]:
    """A section's shape. Its content is checked where it lands: a document
    that uses it is checked like any other when it is saved."""
    issues = []
    if not isinstance(name, str) or not name.strip() or len(name) > 120:
        issues.append({"code": "section.name", "path": "name"})
    if not (
        isinstance(fragment, dict)
        and isinstance(fragment.get("roots"), list)
        and isinstance(fragment.get("nodes"), dict)
    ):
        issues.append({"code": "section.fragment", "path": "fragment"})
    return issues


class Sections(StaffView):
    """GET /api/{kind}/sections: the editor's ``loadSections``. POST: ``saveSection``."""

    model = SavedSection

    def get(self, request: Request, kind: Kind) -> Response:
        sections = SavedSection.objects.live().filter(kit=kind.kit).order_by("name")
        return Response(SectionSerializer(sections, many=True).data)

    @transaction.atomic
    def post(self, request: Request, kind: Kind) -> Response:
        body, actor = body_of(request), actor_of(request)
        name, fragment = body.get("name"), body.get("fragment")
        if issues := section_issues(name, fragment):
            raise Refused(issues=issues)
        section = SavedSection(kit=kind.kit, name=name.strip(), fragment=fragment)
        stamp(section, actor)
        section.save()
        record_activity(section, Action.CREATED, actor)
        return Response(SectionSerializer(section).data, status=201)


class SectionDetail(StaffView):
    """DELETE /api/{kind}/sections/:sid: gone from the editor's list. The
    documents that used it keep their copy."""

    model = SavedSection

    @transaction.atomic
    def delete(self, request: Request, kind: Kind, section_id: UUID) -> Response:
        sections = SavedSection.objects.live().select_for_update().filter(kit=kind.kit)
        soft_delete(find(sections, "section", uuid=section_id), actor_of(request))
        return Response(status=204)


# ── Uploads ──────────────────────────────────────────────────────────────────

#: The largest file accepted, in bytes.
MAX_UPLOAD_BYTES = 20 * 1024 * 1024

#: What a file's first bytes say it is. No SVG: it can carry script.
SIGNATURES: list[tuple[bytes, str, MediaKind]] = [
    (b"\x89PNG\r\n\x1a\n", "image/png", MediaKind.IMAGE),
    (b"\xff\xd8\xff", "image/jpeg", MediaKind.IMAGE),
    (b"GIF87a", "image/gif", MediaKind.IMAGE),
    (b"GIF89a", "image/gif", MediaKind.IMAGE),
    (b"\x1aE\xdf\xa3", "video/webm", MediaKind.VIDEO),
    (b"ID3", "audio/mpeg", MediaKind.AUDIO),
    (b"OggS", "audio/ogg", MediaKind.AUDIO),
    (b"%PDF-", "application/pdf", MediaKind.FILE),
]


def sniff(head: bytes) -> tuple[str, MediaKind] | None:
    """The file's type by its first bytes, never by its name: None when not accepted."""
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp", MediaKind.IMAGE
    if head[4:8] == b"ftyp":
        return "video/mp4", MediaKind.VIDEO
    return next(((mime, kind) for magic, mime, kind in SIGNATURES if head.startswith(magic)), None)


def sha256_of(file: UploadedFile) -> str:
    digest = hashlib.sha256()
    for chunk in file.chunks():
        digest.update(chunk)
    file.seek(0)
    return digest.hexdigest()


def new_key(mime: str) -> str:
    """Where the bytes go: by month, under a name nobody can guess."""
    extension = mimetypes.guess_extension(mime) or ""
    return f"{timezone.now():%Y/%m}/{uuid.uuid4().hex}{extension}"


class Uploads(StaffView):
    """POST /api/uploads: the editor's ``upload``, multipart ``file`` and ``kind``."""

    model = Media
    parser_classes = [MultiPartParser]

    @transaction.atomic
    def post(self, request: Request) -> Response:
        file = request.FILES.get("file")
        if file is None:
            raise Refused(issues=[{"code": "upload.missing", "path": "file"}])
        if file.size is None or file.size > MAX_UPLOAD_BYTES:
            raise TooLarge(message="The file is too large.")
        sniffed = sniff(file.read(16))
        file.seek(0)
        asked = request.data.get("kind")
        # An image block takes an image; "file" takes anything accepted.
        if sniffed is None or (asked != MediaKind.FILE and asked != sniffed[1]):
            raise NotAccepted(message="This kind of file is not accepted.")
        mime, kind = sniffed

        actor = actor_of(request)
        sha256 = sha256_of(file)
        # The same file twice is one row: the second upload gets the first's key.
        media = Media.objects.live().filter(sha256=sha256, kind=kind).first()
        if media is None:
            width, height = get_image_dimensions(file) if kind == MediaKind.IMAGE else (None, None)
            media = Media(
                key=default_storage.save(new_key(mime), file),
                kind=kind,
                mime=mime,
                size=file.size,
                width=width,
                height=height,
                name=(file.name or "")[:300],
                sha256=sha256,
            )
            stamp(media, actor)
            media.save()
            record_activity(media, Action.CREATED, actor)
        return Response(MediaSerializer(media).data, status=201)


class MediaFile(APIView):
    """GET /api/uploads/:key: where the host's ``resolveMedia`` points. A
    redirect to the storage's URL, so a CDN can move in front later."""

    authentication_classes: list[Any] = []
    permission_classes = [AllowAny]

    def get(self, request: Request, key: str) -> HttpResponseRedirect:
        media = find(Media.objects.live(), "file", key=key)
        return HttpResponseRedirect(default_storage.url(media.key))
