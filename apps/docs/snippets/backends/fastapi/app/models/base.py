"""What every table shares: the two ids, who made, changed and deleted each row
and when, and the columns every builder's documents and revisions have in
common. The tables themselves are in the files next to this one."""

from collections.abc import Iterable
from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ColumnElement,
    ForeignKey,
    Identity,
    MetaData,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column, relationship


class Status(StrEnum):
    """Where a document is. Each table allows its own few of these."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    CLOSED = "closed"
    #: A popup taken off the site, kept as it is.
    PAUSED = "paused"


class RevisionKind(StrEnum):
    """Why a revision was written."""

    AUTOSAVE = "autosave"
    MANUAL = "manual"
    PUBLISH = "publish"


#: Milliseconds, as JavaScript keeps time: the ``saved_at`` the editor sends
#: back is then exactly the one stored.
Millis = TIMESTAMP(timezone=True, precision=3)


class Base(DeclarativeBase):
    # Constraints named as PostgreSQL names them, so these tables match the SQL
    # schema and a migration can name what it drops.
    metadata = MetaData(
        naming_convention={
            "pk": "%(table_name)s_pkey",
            "uq": "%(table_name)s_%(column_0_name)s_key",
            "fk": "%(table_name)s_%(column_0_name)s_fkey",
            "ck": "%(table_name)s_%(constraint_name)s",
        }
    )
    type_annotation_map = {
        datetime: TIMESTAMP(timezone=True),
        # A document is stored whole, as the editor sent it. None is SQL null.
        dict[str, Any]: JSONB(none_as_null=True),
    }


def one_of(column: str, values: Iterable[str]) -> CheckConstraint:
    """``check (status in ('draft', 'published'))``, named ``<table>_status_check``."""
    allowed = ", ".join(f"'{value}'" for value in values)
    return CheckConstraint(f"{column} in ({allowed})", name=f"{column}_check")


def user_id() -> Mapped[int | None]:
    """A person on a row. Removing them keeps the row, without their name on it."""
    return mapped_column(ForeignKey("app_user.id", ondelete="SET NULL"))


def person(cls: Any, column: str) -> Mapped["User | None"]:
    """The user that ``column`` points at, for answers that name people."""
    return relationship(User, foreign_keys=f"{cls.__name__}.{column}")


class UuidMixin:
    """The row's two ids: ``id`` for joins, which never leaves the server, and
    ``uuid``, the only one in URLs and answers."""

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    uuid: Mapped[UUID] = mapped_column(unique=True, server_default=func.gen_random_uuid())


class User(UuidMixin, Base):
    """A stand-in for your users table: the audit columns only need its ``id``.
    Point ``user_id()`` at your own table and delete this class."""

    __tablename__ = "app_user"

    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    #: Follows every change: a status, a rename, a triage. Not only the document.
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class AuditMixin:
    """Who made the row and who last changed it. Set from the signed-in user,
    never from the request body."""

    created_by_id: Mapped[int | None] = user_id()
    updated_by_id: Mapped[int | None] = user_id()

    @declared_attr
    def created_by(cls) -> Mapped[User | None]:
        return person(cls, "created_by_id")

    @declared_attr
    def updated_by(cls) -> Mapped[User | None]:
        return person(cls, "updated_by_id")


class SoftDeleteMixin:
    """Deleting stamps these; the row stays, so it can be restored and its
    history still makes sense."""

    deleted_at: Mapped[datetime | None]
    deleted_by_id: Mapped[int | None] = user_id()

    @declared_attr
    def deleted_by(cls) -> Mapped[User | None]:
        return person(cls, "deleted_by_id")

    @classmethod
    def live(cls) -> ColumnElement[bool]:
        """The filter every query on live rows carries."""
        return cls.deleted_at.is_(None)


class Audited(UuidMixin, TimestampMixin, AuditMixin, SoftDeleteMixin):
    """Every audit column: what each table but the history ones carries."""

    #: Each table's name: also its subject_type in the activity log.
    __tablename__: str


class DocumentMixin:
    """A builder's document: the live one, the draft since, and the clock the
    editor checks to catch two people saving at once."""

    document: Mapped[dict[str, Any]]
    draft_document: Mapped[dict[str, Any] | None]
    #: Changes only when the document is written. A save that brings an older
    #: one is a stale copy.
    saved_at: Mapped[datetime] = mapped_column(Millis, server_default=func.now())
    #: Counts publishes.
    version: Mapped[int] = mapped_column(server_default="0")
    published_at: Mapped[datetime | None]
    published_by_id: Mapped[int | None] = user_id()

    @declared_attr
    def published_by(cls) -> Mapped[User | None]:
        return person(cls, "published_by_id")


class RevisionMixin(UuidMixin):
    """A whole document as it was: written once and never changed, so it has no
    ``updated_*`` or ``deleted_*``. Each table adds its document's key as
    ``document_id``, over its own column name."""

    kind: Mapped[str] = mapped_column(String(16))
    #: A name someone gave it: "Before the legal review".
    label: Mapped[str | None] = mapped_column(String(120))
    #: The document's version then.
    version: Mapped[int]
    document: Mapped[dict[str, Any]]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by_id: Mapped[int | None] = user_id()

    @declared_attr
    def created_by(cls) -> Mapped[User | None]:
        return person(cls, "created_by_id")

    @declared_attr.directive
    def __table_args__(cls) -> tuple[Any, ...]:
        return (one_of("kind", RevisionKind),)
