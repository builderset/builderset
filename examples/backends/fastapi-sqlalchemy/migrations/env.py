"""Runs the migrations against DATABASE_URL: ``uv run alembic upgrade head``."""

from alembic import context
from sqlalchemy import create_engine

from app.db import database_url
from app.models import Base

with create_engine(database_url()).connect() as connection:
    # The models, for `alembic revision --autogenerate` to compare against.
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
