"""The library every builder shares: saved sections and uploaded media."""

from enum import StrEnum
from typing import Any

from sqlalchemy import CHAR, CheckConstraint, Index, String, false
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Audited, Base, one_of


class Kit(StrEnum):
    """Which builder: the checks its documents get, and its saved sections."""

    EMAIL = "email"
    ARTICLE = "article"
    FORM = "form"
    CARD = "card"
    POPUP = "popup"


#: The builders whose editors keep a library of sections. Cards and popups keep none.
SECTION_KITS = (Kit.EMAIL, Kit.ARTICLE, Kit.FORM)


class MediaKind(StrEnum):
    """What the editor offers a file for."""

    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"


class SavedSection(Audited, Base):
    """A piece of a document saved to reuse: an email header, an article's call
    to action. Deleting one hides it from the editor; documents keep their copy."""

    __tablename__ = "saved_section"
    __table_args__ = (one_of("kit", SECTION_KITS),)

    kit: Mapped[str] = mapped_column(String(16))
    name: Mapped[str] = mapped_column(String(120))
    #: The editor's ``{ roots, nodes }``.
    fragment: Mapped[dict[str, Any]]
    #: An email section kept in step everywhere it is used.
    synced: Mapped[bool] = mapped_column(server_default=false())


Index(
    "saved_section_by_kit",
    SavedSection.kit,
    SavedSection.name,
    postgresql_where=SavedSection.live(),
)


class Media(Audited, Base):
    """Every uploaded file, by the key the documents store. A document holds the
    key, never a URL: the URL is built when it is shown, so a CDN can move in
    front. ``created_by`` is who uploaded it."""

    __tablename__ = "media"
    __table_args__ = (
        one_of("kind", MediaKind),
        CheckConstraint("size > 0", name="size_check"),
    )

    #: Where the bytes are: 2026/11/3f9c….png
    key: Mapped[str] = mapped_column(String(300), unique=True)
    kind: Mapped[str] = mapped_column(String(8))
    #: Checked by the file's first bytes, not by its name.
    mime: Mapped[str] = mapped_column(String(100))
    size: Mapped[int]
    width: Mapped[int | None]
    height: Mapped[int | None]
    #: The name it was uploaded with.
    name: Mapped[str] = mapped_column(String(300))
    alt: Mapped[str] = mapped_column(String(300), server_default="")
    #: The same file uploaded twice becomes one row.
    sha256: Mapped[str] = mapped_column(CHAR(64))


Index("media_library", Media.kind, Media.created_at.desc(), postgresql_where=Media.live())
Index("media_by_hash", Media.sha256)
