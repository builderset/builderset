"""Soft delete: the trash, and back out of it."""

from typing import Any

from fastapi.testclient import TestClient

from tests.api import actions, create_email, unique, with_meta


def listed(client: TestClient, name: str, *, deleted: bool = False) -> list[str]:
    page = client.get("/api/emails", params={"q": name, "deleted": deleted}).json()
    return [item["id"] for item in page["items"]]


def test_deleted_restored_and_listed(client: TestClient, starter: dict[str, Any]) -> None:
    name = unique("Trash")
    email_id = create_email(client, with_meta(starter, name=name))["id"]
    base = f"/api/emails/{email_id}"
    published = client.post(f"{base}/publish", json={"document": with_meta(starter, name=name)})
    assert published.status_code == 200

    # A live template stays: unpublish it first.
    assert client.delete(base).status_code == 409
    client.post(f"{base}/unpublish")
    assert client.delete(base).status_code == 204

    assert client.get(base).status_code == 404
    assert client.put(f"{base}/draft", json={"document": starter}).status_code == 404
    assert listed(client, name) == []
    trash = client.get("/api/emails", params={"q": name, "deleted": True}).json()
    assert trash["total"] == 1
    assert trash["items"][0]["deleted_by"]["name"] == "Example Editor"

    restored = client.post(f"{base}/restore")
    assert restored.status_code == 200
    assert restored.json()["deleted_at"] is None
    assert listed(client, name) == [email_id]
    assert listed(client, name, deleted=True) == []
    # Restoring what is not in the trash finds nothing.
    assert client.post(f"{base}/restore").status_code == 404

    assert actions(client, email_id)[-2:] == ["deleted", "restored"]


def test_the_list_pages_and_filters(client: TestClient, starter: dict[str, Any]) -> None:
    name = unique("Paged")
    ids = [create_email(client, with_meta(starter, name=name))["id"] for _ in range(3)]

    first = client.get("/api/emails", params={"q": name, "limit": 2}).json()
    assert first["total"] == 3
    # Newest change first.
    assert [item["id"] for item in first["items"]] == ids[:0:-1]
    second = client.get("/api/emails", params={"q": name, "limit": 2, "offset": 2}).json()
    assert [item["id"] for item in second["items"]] == ids[:1]

    published = client.get("/api/emails", params={"q": name, "status": "published"}).json()
    assert published["total"] == 0
