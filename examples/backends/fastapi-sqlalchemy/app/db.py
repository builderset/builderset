"""The database: one engine per process, one session per request."""

import os
from collections.abc import Iterator
from functools import cache

from sqlalchemy import URL, Engine, create_engine, make_url
from sqlalchemy.orm import Session


def database_url() -> URL:
    """DATABASE_URL, written as Node and Postgres write it (``postgresql://``).

    SQLAlchemy reads the scheme to choose a driver; this sets psycopg 3.
    """
    return make_url(os.environ["DATABASE_URL"]).set(drivername="postgresql+psycopg")


@cache
def engine() -> Engine:
    return create_engine(database_url())


def get_session() -> Iterator[Session]:
    with Session(engine()) as session:
        yield session
