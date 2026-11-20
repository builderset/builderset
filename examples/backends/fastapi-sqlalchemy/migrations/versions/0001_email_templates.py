"""The users, the email templates with their revisions, and the activity log.

Written by ``alembic revision --autogenerate``, then put in reading order.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def public_id() -> list[sa.Column[object]]:
    return [
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("uuid", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
    ]


def user_id(name: str) -> sa.Column[int]:
    return sa.Column(name, sa.BigInteger(), nullable=True)


def user_fk(table: str, column: str) -> sa.ForeignKeyConstraint:
    return sa.ForeignKeyConstraint(
        [column], ["app_user.id"], name=op.f(f"{table}_{column}_fkey"), ondelete="SET NULL"
    )


def created_at() -> sa.Column[object]:
    return sa.Column(
        "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )


def one_of(table: str, column: str, *values: str) -> sa.CheckConstraint:
    """The CHECK ``app.models.base.choice`` puts on an enum's column."""
    listed = ", ".join(f"'{value}'" for value in values)
    return sa.CheckConstraint(f"{column} in ({listed})", name=op.f(f"{table}_{column}_check"))


DOCUMENT = postgresql.JSONB(none_as_null=True, astext_type=sa.Text())


def upgrade() -> None:
    op.create_table(
        "app_user",
        *public_id(),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        created_at(),
        sa.PrimaryKeyConstraint("id", name=op.f("app_user_pkey")),
        sa.UniqueConstraint("email", name=op.f("app_user_email_key")),
        sa.UniqueConstraint("uuid", name=op.f("app_user_uuid_key")),
    )

    op.create_table(
        "email_template",
        *public_id(),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("type_key", sa.String(length=60), nullable=True),
        sa.Column("status", sa.String(length=16), server_default="draft", nullable=False),
        sa.Column("document", DOCUMENT, nullable=False),
        sa.Column("draft_document", DOCUMENT, nullable=True),
        sa.Column(
            "saved_at",
            postgresql.TIMESTAMP(timezone=True, precision=3),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), server_default="0", nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        user_id("published_by_id"),
        created_at(),
        user_id("created_by_id"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        user_id("updated_by_id"),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        user_id("deleted_by_id"),
        sa.PrimaryKeyConstraint("id", name=op.f("email_template_pkey")),
        sa.UniqueConstraint("uuid", name=op.f("email_template_uuid_key")),
        one_of("email_template", "status", "draft", "published"),
        user_fk("email_template", "published_by_id"),
        user_fk("email_template", "created_by_id"),
        user_fk("email_template", "updated_by_id"),
        user_fk("email_template", "deleted_by_id"),
    )
    op.create_index(
        "email_template_one_active_per_type",
        "email_template",
        ["type_key"],
        unique=True,
        postgresql_where=sa.text("status = 'published' AND deleted_at IS NULL"),
    )
    op.create_index(
        "email_template_list",
        "email_template",
        [sa.literal_column("updated_at DESC")],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "email_template_revision",
        *public_id(),
        sa.Column("email_template_id", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("document", DOCUMENT, nullable=False),
        created_at(),
        user_id("created_by_id"),
        sa.PrimaryKeyConstraint("id", name=op.f("email_template_revision_pkey")),
        sa.UniqueConstraint("uuid", name=op.f("email_template_revision_uuid_key")),
        one_of("email_template_revision", "kind", "autosave", "manual", "publish"),
        sa.ForeignKeyConstraint(
            ["email_template_id"],
            ["email_template.id"],
            name=op.f("email_template_revision_email_template_id_fkey"),
            ondelete="CASCADE",
        ),
        user_fk("email_template_revision", "created_by_id"),
    )
    op.create_index(
        "email_template_revision_history",
        "email_template_revision",
        ["email_template_id", sa.literal_column("created_at DESC")],
    )

    op.create_table(
        "activity",
        *public_id(),
        sa.Column("subject_type", sa.String(length=30), nullable=False),
        sa.Column("subject_id", sa.BigInteger(), nullable=False),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("from_status", sa.String(length=30), nullable=True),
        sa.Column("to_status", sa.String(length=30), nullable=True),
        sa.Column("details", DOCUMENT, server_default=sa.text("'{}'"), nullable=False),
        user_id("actor_id"),
        created_at(),
        sa.PrimaryKeyConstraint("id", name=op.f("activity_pkey")),
        sa.UniqueConstraint("uuid", name=op.f("activity_uuid_key")),
        one_of(
            "activity",
            "subject_type",
            "email_template",
            "article",
            "form",
            "form_response",
            "saved_section",
            "media",
        ),
        one_of(
            "activity",
            "action",
            "created",
            "saved",
            "renamed",
            "published",
            "scheduled",
            "unpublished",
            "closed",
            "reverted",
            "status_changed",
            "deleted",
            "restored",
        ),
        user_fk("activity", "actor_id"),
    )
    op.create_index(
        "activity_timeline",
        "activity",
        ["subject_type", "subject_id", sa.literal_column("created_at DESC")],
    )
    op.create_index(
        "activity_by_actor", "activity", ["actor_id", sa.literal_column("created_at DESC")]
    )


def downgrade() -> None:
    # Their indexes go with them.
    op.drop_table("activity")
    op.drop_table("email_template_revision")
    op.drop_table("email_template")
    op.drop_table("app_user")
