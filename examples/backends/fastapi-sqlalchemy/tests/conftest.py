"""A real Postgres for the tests, migrated by Alembic as production is.

The one in TEST_DATABASE_URL when it is set (CI starts one as a service),
otherwise a new one in a container. Never DATABASE_URL: the tests write rows,
and that may be a database you care about.
"""

import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from testcontainers.community.postgres import PostgresContainer

from tests.fixtures import fixture

PROJECT = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    if url := os.environ.get("TEST_DATABASE_URL"):
        yield url
        return
    with PostgresContainer("postgres:18-alpine", driver=None) as postgres:
        yield postgres.get_connection_url()


@pytest.fixture(scope="session")
def client(database_url: str) -> Iterator[TestClient]:
    # The app and Alembic read DATABASE_URL.
    os.environ["DATABASE_URL"] = database_url
    command.upgrade(Config(PROJECT / "alembic.ini"), "head")
    from app.main import app

    with TestClient(app) as client:
        yield client


@pytest.fixture
def starter() -> dict[str, Any]:
    document: dict[str, Any] = fixture("valid/starter.json")
    return document
