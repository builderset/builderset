"""The database: one engine per process, one session per request."""

import os
from collections.abc import Iterator
from functools import cache

from sqlalchemy import Engine, create_engine, make_url
from sqlalchemy.orm import Session


@cache
def engine() -> Engine:
    # DATABASE_URL as Postgres writes it (postgresql://…); psycopg 3 drives it.
    url = make_url(os.environ["DATABASE_URL"]).set(drivername="postgresql+psycopg")
    return create_engine(url)


def get_session() -> Iterator[Session]:
    """A session for one request. A route commits its own transaction; one that
    raises is rolled back when the session closes."""
    with Session(engine()) as session:
        yield session
