"""An email template, through the routes the editor calls."""

from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from tests.api import actions, create_email, unique, with_meta
from tests.fixtures import fixture


def test_created_saved_conflicting_published_and_sent(
    client: TestClient, starter: dict[str, Any]
) -> None:
    created = create_email(client, starter)
    base = f"/api/emails/{created['id']}"
    first_save = created["saved_at"]
    assert created["status"] == "draft"
    assert created["created_by"]["name"] == "Example Editor"

    edited = with_meta(starter, subject="Welcome, {{ recipient.name }}")
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
    # "Keep mine" saves anyway.
    forced = client.put(
        f"{base}/draft",
        json={"document": edited, "expected_saved_at": first_save, "force": True},
    )
    assert forced.status_code == 200

    # Not published yet: nothing is sent.
    assert client.post(f"{base}/send", json={"data": {}}).status_code == 409

    published = client.post(f"{base}/publish", json={"document": edited, "scheduled_at": None})
    assert published.status_code == 200
    assert published.json()["status"] == "published"

    record = client.get(base).json()
    assert record["status"] == "published"
    assert record["version"] == 1
    assert record["draft_document"] is None
    assert record["document"]["meta"]["subject"] == "Welcome, {{ recipient.name }}"
    assert record["published_by"]["name"] == "Example Editor"

    sent = client.post(f"{base}/send", json={"data": {"recipient": {"name": "Ana"}}})
    assert sent.status_code == 200
    email = sent.json()
    assert email["subject"] == "Welcome, Ana"
    assert "Hello Ana" in email["html"]
    assert "hello ana" in email["text"].lower()

    unpublished = client.post(f"{base}/unpublish").json()
    assert unpublished["status"] == "draft"
    # Only a document write moves saved_at: an open editor's copy is still current.
    assert unpublished["saved_at"] == published.json()["saved_at"]
    # The autosaves are not in the timeline.
    assert actions(client, created["id"]) == ["created", "published", "unpublished"]


def test_publishing_one_design_retires_the_one_active_before(
    client: TestClient, starter: dict[str, Any]
) -> None:
    type_key = unique("welcome").replace("-", "_")
    first = create_email(client, starter, type_key)
    second = create_email(client, starter, type_key)
    for email in (first, second):
        answer = client.post(f"/api/emails/{email['id']}/publish", json={"document": starter})
        assert answer.status_code == 200

    assert client.get(f"/api/emails/{first['id']}").json()["status"] == "draft"
    assert client.get(f"/api/emails/{second['id']}").json()["status"] == "published"
    retired = client.get(f"/api/emails/{first['id']}/activity").json()[0]
    assert retired["action"] == "unpublished"
    assert retired["details"] == {"replaced_by": second["id"]}


@pytest.mark.parametrize(("file", "code"), fixture("invalid/manifest.json").items())
def test_refuses_an_invalid_document(
    client: TestClient, starter: dict[str, Any], file: str, code: str
) -> None:
    created = create_email(client, starter)
    refused = client.put(
        f"/api/emails/{created['id']}/draft",
        json={"document": fixture(f"invalid/{file}"), "expected_saved_at": None},
    )
    assert refused.status_code == 422
    assert code in [issue["code"] for issue in refused.json()["issues"]]


def test_saves_an_unfinished_draft_but_does_not_publish_it(
    client: TestClient, starter: dict[str, Any]
) -> None:
    created = create_email(client, starter)
    base = f"/api/emails/{created['id']}"
    unfinished = with_meta(starter, subject="")
    saved = client.put(
        f"{base}/draft",
        json={"document": unfinished, "expected_saved_at": created["saved_at"]},
    )
    assert saved.status_code == 200
    refused = client.post(f"{base}/publish", json={"document": unfinished})
    assert refused.status_code == 422
    assert [issue["code"] for issue in refused.json()["issues"]] == ["meta.subjectMissing"]


def test_a_save_that_names_no_saved_at_is_refused_unless_forced(
    client: TestClient, starter: dict[str, Any]
) -> None:
    base = f"/api/emails/{create_email(client, starter)['id']}"
    assert client.put(f"{base}/draft", json={"document": starter}).status_code == 409
    forced = client.put(f"{base}/draft", json={"document": starter, "force": True})
    assert forced.status_code == 200


def test_answers_404_for_a_template_that_does_not_exist(client: TestClient) -> None:
    assert client.get(f"/api/emails/{uuid4()}").status_code == 404
