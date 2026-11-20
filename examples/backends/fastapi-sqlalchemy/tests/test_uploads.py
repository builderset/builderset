"""Images, stored under keys of the server's own."""

from fastapi.testclient import TestClient

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
