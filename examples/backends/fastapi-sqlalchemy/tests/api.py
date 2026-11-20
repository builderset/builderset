"""Small helpers the tests share."""

from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient


def unique(prefix: str) -> str:
    """A name no earlier run left behind: TEST_DATABASE_URL may keep its rows."""
    return f"{prefix}-{uuid4().hex[:12]}"


def with_meta(document: dict[str, Any], **meta: str) -> dict[str, Any]:
    return {**document, "meta": {**document["meta"], **meta}}


def create_email(
    client: TestClient, document: dict[str, Any], type_key: str | None = None
) -> dict[str, Any]:
    answer = client.post("/api/emails", json={"document": document, "type_key": type_key})
    assert answer.status_code == 201, answer.text
    created: dict[str, Any] = answer.json()
    return created


def actions(client: TestClient, email_id: str) -> list[str]:
    """The template's timeline, oldest first."""
    entries = client.get(f"/api/emails/{email_id}/activity").json()
    return [entry["action"] for entry in reversed(entries)]
