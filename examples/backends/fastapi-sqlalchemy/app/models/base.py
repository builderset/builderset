"""What every table shares: the audit columns, and the users they point at.

A change to a model needs a migration: ``alembic revision --autogenerate -m "…"``
writes it from the difference.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    ColumnElement,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    MetaData,
    String,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr, mapped_column, relationship


class Base(DeclarativeBase):
    # Constraint names as PostgreSQL itself picks them, so the tables match the
    # SQL schema name for name.
    metadata = MetaData(
        naming_convention={
            "pk": "%(table_name)s_pkey",
            "uq": "%(table_name)s_%(column_0_name)s_key",
            "fk": "%(table_name)s_%(column_0_name)s_fkey",
            "ck": "%(table_name)s_%(constraint_name)s_check",
        }
    )
    type_annotation_map = {  # noqa: RUF012 (SQLAlchemy reads it from the class)
        datetime: DateTime(timezone=True),
        # A document is stored whole, as the editor sent it. ``None`` is SQL NULL, not JSON null.
        dict[str, Any]: JSONB(none_as_null=True),
        UUID: Uuid(),
    }


def choice(values: type[StrEnum], length: int, *, column: str) -> Enum:
    """A ``varchar(length)`` that holds only the enum's values, by a CHECK named
    after its column (``email_template_status_check``)."""
    return Enum(
        values,
        name=column,
        native_enum=False,
        create_constraint=True,
        length=length,
        # The values ("draft"), not the member names ("DRAFT").
        values_callable=lambda members: [member.value for member in members],
    )


def user_id() -> Mapped[int | None]:
    """A column pointing at a person. Removing the person keeps the row, without their name."""
    return mapped_column(BigInteger, ForeignKey("app_user.id", ondelete="SET NULL"))


class Identified:
    """``id`` for joins, which never leaves the server; ``uuid``, the public id."""

    # First in the table, ahead of the columns of the class that uses it.
    id: Mapped[int] = mapped_column(
        BigInteger, Identity(always=True), primary_key=True, sort_order=-1
    )
    uuid: Mapped[UUID] = mapped_column(
        unique=True, server_default=func.gen_random_uuid(), sort_order=-1
    )


class AppUser(Identified, Base):
    """Your users. The schema needs only ``id``: point ``user_id()`` at your own
    table and drop this one."""

    __tablename__ = "app_user"

    email: Mapped[str] = mapped_column(String(254), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


def person(model: Any, column: str) -> Mapped[AppUser | None]:
    """The person a ``user_id()`` column points at, for answers that name them.
    ``model`` is the class being mapped, which tells apart its several user columns."""
    return relationship(AppUser, foreign_keys=f"{model.__name__}.{column}")


class Audited(Identified):
    """Who made the row, who last changed it and who deleted it, and when.

    The server sets the ``*_by`` columns from the signed-in user, never from the
    request. Deleting is a soft delete: the row stays, to restore and to keep
    its history readable.
    """

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    created_by_id: Mapped[int | None] = user_id()
    # Follows every change the app makes. The SQL schema keeps it with a trigger,
    # which also catches writes from psql or a job.
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    updated_by_id: Mapped[int | None] = user_id()
    deleted_at: Mapped[datetime | None]
    deleted_by_id: Mapped[int | None] = user_id()

    @declared_attr
    def created_by(cls) -> Mapped[AppUser | None]:
        return person(cls, "created_by_id")

    @declared_attr
    def updated_by(cls) -> Mapped[AppUser | None]:
        return person(cls, "updated_by_id")

    @declared_attr
    def deleted_by(cls) -> Mapped[AppUser | None]:
        return person(cls, "deleted_by_id")

    @classmethod
    def live(cls) -> ColumnElement[bool]:
        """Rows not in the trash. Every query on live rows filters on it."""
        return cls.deleted_at.is_(None)
