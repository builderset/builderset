"""An email template, through the routes the editor calls."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.fixtures import fixture


def create(client: TestClient, document: dict[str, Any]) -> dict[str, Any]:
    answer = client.post("/api/emails", json={"name": "Welcome", "document": document})
    assert answer.status_code == 201
    created: dict[str, Any] = answer.json()
    return created


def test_created_saved_conflicting_published_and_sent(
    client: TestClient, starter: dict[str, Any]
) -> None:
    created = create(client, starter)
    base = f"/api/emails/{created['id']}"
    first_save = created["saved_at"]

    edited = {**starter, "meta": {**starter["meta"], "subject": "Welcome, {{ recipient.name }}"}}
    saved = client.put(
        f"{base}/draft",
        json={"document": edited, "reason": "autosave", "expected_saved_at": first_save},
    )
    assert saved.status_code == 200
    assert saved.json()["saved_at"] != first_save

    # Another editor still holding the first save's time.
    stale = client.put(
        f"{base}/draft",
        json={"document": edited, "reason": "manual", "expected_saved_at": first_save},
    )
    assert stale.status_code == 409

    # Not published yet: nothing is sent.
    assert client.post(f"{base}/send", json={"data": {}}).status_code == 409

    published = client.post(f"{base}/publish", json={"document": edited, "scheduled_at": None})
    assert published.status_code == 200
    assert published.json()["status"] == "published"

    record = client.get(base).json()
    assert record["status"] == "published"
    assert record["draft_document"] is None
    assert record["document"]["meta"]["subject"] == "Welcome, {{ recipient.name }}"

    sent = client.post(f"{base}/send", json={"data": {"recipient": {"name": "Ana"}}})
    assert sent.status_code == 200
    email = sent.json()
    assert email["subject"] == "Welcome, Ana"
    assert "Hello Ana" in email["html"]
    assert "hello ana" in email["text"].lower()

    assert client.post(f"{base}/unpublish").json()["status"] == "draft"


@pytest.mark.parametrize(("file", "code"), fixture("invalid/manifest.json").items())
def test_refuses_an_invalid_document(
    client: TestClient, starter: dict[str, Any], file: str, code: str
) -> None:
    created = create(client, starter)
    refused = client.put(
        f"/api/emails/{created['id']}/draft",
        json={"document": fixture(f"invalid/{file}"), "expected_saved_at": None},
    )
    assert refused.status_code == 422
    assert code in [issue["code"] for issue in refused.json()["issues"]]


def test_saves_an_unfinished_draft_but_does_not_publish_it(
    client: TestClient, starter: dict[str, Any]
) -> None:
    base = f"/api/emails/{create(client, starter)['id']}"
    unfinished = {**starter, "meta": {**starter["meta"], "subject": ""}}
    assert client.put(f"{base}/draft", json={"document": unfinished}).status_code == 200
    refused = client.post(f"{base}/publish", json={"document": unfinished})
    assert refused.status_code == 422
    assert [issue["code"] for issue in refused.json()["issues"]] == ["meta.subjectMissing"]


def test_answers_404_for_a_template_that_does_not_exist(client: TestClient) -> None:
    assert client.get("/api/emails/999999999").status_code == 404


PNG = b"\x89PNG\r\n\x1a\n"


def test_stores_an_image_under_a_key_of_its_own_and_serves_it(client: TestClient) -> None:
    answer = client.post("/api/uploads", files={"file": ("logo.png", PNG)}, data={"kind": "image"})
    assert answer.status_code == 201
    stored = answer.json()
    assert stored["key"].startswith("emails/") and stored["key"].endswith(".png")
    assert stored["mime"] == "image/png"
    served = client.get(stored["url"])
    assert served.headers["content-type"] == "image/png"
    assert served.content == PNG


def test_knows_a_file_by_its_bytes_not_its_name(client: TestClient) -> None:
    answer = client.post(
        "/api/uploads", files={"file": ("photo.png", b"<script>")}, data={"kind": "image"}
    )
    assert answer.status_code == 415
