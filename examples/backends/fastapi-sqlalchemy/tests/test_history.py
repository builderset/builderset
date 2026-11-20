"""A template's revisions and its activity."""

from typing import Any

from fastapi.testclient import TestClient

from tests.api import actions, create_email, with_meta


def test_a_manual_save_and_a_publish_each_write_a_revision_and_an_activity(
    client: TestClient, starter: dict[str, Any]
) -> None:
    created = create_email(client, starter)
    email_id = created["id"]
    base = f"/api/emails/{email_id}"

    autosaved = client.put(
        f"{base}/draft",
        json={
            "document": with_meta(starter, subject="Autosaved"),
            "expected_saved_at": created["saved_at"],
        },
    )
    assert autosaved.status_code == 200
    manual = with_meta(starter, subject="Saved by hand")
    saved = client.put(
        f"{base}/draft",
        json={
            "document": manual,
            "reason": "manual",
            "expected_saved_at": autosaved.json()["saved_at"],
        },
    )
    assert saved.status_code == 200
    assert client.post(f"{base}/publish", json={"document": manual}).status_code == 200

    revisions = client.get(f"{base}/revisions").json()
    assert [(r["kind"], r["version"]) for r in revisions] == [("publish", 1), ("manual", 0)]
    assert revisions[0]["author"] == "Example Editor"
    # An autosave writes neither a revision nor an activity.
    assert actions(client, email_id) == ["created", "saved", "published"]

    timeline = client.get(f"{base}/activity").json()
    published = timeline[0]
    assert (published["from_status"], published["to_status"]) == ("draft", "published")
    assert published["actor"]["name"] == "Example Editor"
    assert published["details"] == {"revision": revisions[0]["id"], "version": 1}

    kept = client.get(f"{base}/revisions/{revisions[1]['id']}").json()
    assert kept["document"]["meta"]["subject"] == "Saved by hand"


def test_a_named_version_leaves_the_template_as_it_was(
    client: TestClient, starter: dict[str, Any]
) -> None:
    created = create_email(client, starter)
    base = f"/api/emails/{created['id']}"
    named = client.post(
        f"{base}/revisions", json={"document": starter, "label": "Before the legal review"}
    )
    assert named.status_code == 201
    assert named.json()["label"] == "Before the legal review"
    assert client.get(base).json()["saved_at"] == created["saved_at"]
    assert actions(client, created["id"]) == ["created", "saved"]


def test_a_revision_is_found_only_under_its_own_template(
    client: TestClient, starter: dict[str, Any]
) -> None:
    owner = create_email(client, starter)["id"]
    other = create_email(client, starter)["id"]
    client.post(f"/api/emails/{owner}/revisions", json={"document": starter, "label": None})
    revision_id = client.get(f"/api/emails/{owner}/revisions").json()[0]["id"]
    assert client.get(f"/api/emails/{other}/revisions/{revision_id}").status_code == 404
