"""The builder document check — the server half of the contract.

``@builderset/article`` ships its JSON Schema and a set of fixtures, copied
into this tree from the installed version by ``scripts/sync-builder-contract.mjs``.
Every valid fixture must pass here and
every invalid one must be refused with the code its manifest names: when the
editor and the API disagree about what an article may contain, one of these
fails before a writer finds out.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.domains.content.document import (
    DRAFT_TOLERATES,
    check_document,
    detect_embed_provider,
    document_from_legacy,
    is_safe_url,
    media_keys,
    plain_text,
    reading_minutes_of,
)

FIXTURES = Path(__file__).parent.parent / "fixtures" / "builder"


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _codes(document: Any) -> set[str]:
    return {issue.code for issue in check_document(document)}


#: The kit's valid fixtures, and the converted legacy article (MotorsAL's own,
#: written by ``packages/builder-presets``).
VALID = [*sorted((FIXTURES / "valid").glob("*.json")), FIXTURES / "motors" / "legacy.json"]
MANIFEST: dict[str, str] = json.loads((FIXTURES / "invalid" / "manifest.json").read_text())


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "empty", "legacy"}
        assert len(MANIFEST) >= 8

    def test_a_draft_is_lenient_on_the_kits_codes_exactly(self) -> None:
        draft = json.loads((FIXTURES / "draft.json").read_text(encoding="utf-8"))
        assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        assert check_document(_load(path)) == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_code(self, name: str) -> None:
        assert MANIFEST[name] in _codes(_load(FIXTURES / "invalid" / name))

    def test_the_kitchen_sink_uses_every_standard_element(self) -> None:
        document = _load(FIXTURES / "valid" / "kitchen-sink.json")
        schema = json.loads(
            (
                Path(__file__).parents[2] / "app" / "domains" / "content" / "builder_schema.json"
            ).read_text(encoding="utf-8")
        )
        used = {node["type"] for node in document["nodes"].values()}
        assert used == set(schema["x-elements"])


class TestRefusals:
    def _paragraph_doc(self, **node: Any) -> dict[str, Any]:
        return {
            "schema": "builder/document",
            "version": 1,
            "root": "root",
            "nodes": {
                "root": {"id": "root", "type": "root", "v": 1, "props": {}, "children": ["n1"]},
                "n1": {
                    "id": "n1",
                    "type": "paragraph",
                    "v": 1,
                    "props": {"text": [{"text": "Hi"}], "dropCap": False, "lead": False},
                    **node,
                },
            },
            "meta": {"title": "T"},
        }

    def test_not_a_document_at_all(self) -> None:
        assert _codes("<p>hello</p>") and _codes({"nodes": []})

    def test_a_cycle_is_refused_not_followed(self) -> None:
        document = self._paragraph_doc()
        document["nodes"]["n1"] = {
            "id": "n1",
            "type": "section",
            "v": 1,
            "props": {},
            "children": ["n1"],
        }
        assert _codes(document)

    def test_media_outside_the_article_folders(self) -> None:
        document = _load(FIXTURES / "motors" / "legacy.json")
        for node in document["nodes"].values():
            if node["type"] == "image":
                node["props"]["media"]["key"] = "brand-logo/2026/01/aaaaaaaaaaaaaaaa.png"
        assert "media.wrongFolder" in _codes(document)

    def test_a_draft_tolerates_only_work_in_progress(self) -> None:
        # Unsafe URLs and a broken tree are never "in progress".
        assert "url.unsafe" not in DRAFT_TOLERATES
        assert "document.orphan" not in DRAFT_TOLERATES
        assert "media.external" in DRAFT_TOLERATES


class TestHelpers:
    @pytest.mark.parametrize(
        ("url", "safe"),
        [
            ("https://marrimauto.com/a", True),
            ("mailto:a@b.c", True),
            ("/blog/x", True),
            ("#top", True),
            ("javascript:alert(1)", False),
            (" JaVaScRiPt:alert(1)", False),
            ("data:text/html,x", False),
            ("//evil.test", False),
        ],
    )
    def test_is_safe_url(self, url: str, safe: bool) -> None:
        assert is_safe_url(url) is safe

    def test_embed_providers(self) -> None:
        assert detect_embed_provider("https://youtu.be/dQw4w9WgXcQ") == "youtube"
        assert detect_embed_provider("https://vimeo.com/12345") == "vimeo"
        assert detect_embed_provider("https://evil.test/watch?v=123456") is None

    def test_legacy_conversion_is_a_valid_document(self) -> None:
        document = document_from_legacy(
            [
                {"kind": "heading", "text": "A heading"},
                {"kind": "paragraph", "text": "Some words here."},
                {"kind": "list", "items": ["One", " ", "Two"]},
                {"kind": "quote", "text": "Quoted."},
                {
                    "kind": "image",
                    "key": "article-image/2026/01/aaaaaaaaaaaaaaaa.jpg",
                    "alt": "A",
                    "caption": "C",
                },
            ],
            title="Legacy",
            excerpt="An excerpt long enough.",
            cover_key=None,
            cover_alt=None,
        )
        assert check_document(document) == []
        assert media_keys(document) == ["article-image/2026/01/aaaaaaaaaaaaaaaa.jpg"]
        assert "Some words here." in plain_text(document)
        assert reading_minutes_of(document) == 1


def _with_languages(base: str, *others: str) -> dict[str, Any]:
    document = _load(FIXTURES / "valid" / "empty.json")
    document["i18n"] = {
        "enabled": True,
        "base": base,
        "translations": {locale: {"meta": {"title": "x"}} for locale in others},
    }
    return document


def test_any_language_code_is_a_valid_document() -> None:
    """The contract no longer lists languages: a French or Brazilian article is well formed."""
    assert _codes(_with_languages("fr", "pt-BR")) == set()


def test_a_malformed_language_code_is_refused() -> None:
    assert "document.malformed" in _codes(_with_languages("French"))


def test_the_project_decides_which_languages_it_writes_in() -> None:
    document = _with_languages("sq", "en", "fr")
    issues = check_document(document, locales=("sq", "en", "de"))
    unknown = [issue for issue in issues if issue.code == "i18n.locale.unknown"]
    assert [issue.params for issue in unknown] == [{"locale": "fr"}]
    # A draft may hold it while the writer works; publishing refuses it.
    assert "i18n.locale.unknown" in DRAFT_TOLERATES
