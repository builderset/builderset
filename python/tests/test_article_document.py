"""``check_article`` against ``@builderset/article``'s own fixtures.

Every valid fixture must pass and every invalid one be refused with the code
its manifest names, exactly as the TypeScript checker does: when an editor and
a Python backend disagree about what an article may contain, one of these
fails before a writer finds out.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from builderset.article import (
    DRAFT_TOLERATES,
    check_article,
    detect_embed_provider,
    is_safe_url,
    media_keys,
    plain_text,
    reading_minutes_of,
)
from builderset.article.document import SCHEMA_PATH
from conftest import ARTICLE_FIXTURES


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _codes(document: Any, **kwargs: Any) -> set[str]:
    return {issue.code for issue in check_article(document, **kwargs)}


VALID = sorted((ARTICLE_FIXTURES / "valid").glob("*.json"))
MANIFEST: dict[str, str] = json.loads(
    (ARTICLE_FIXTURES / "invalid" / "manifest.json").read_text(encoding="utf-8")
)


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "empty"}
        assert len(MANIFEST) >= 8

    def test_a_draft_is_lenient_on_the_kits_codes_exactly(self) -> None:
        draft = _load(ARTICLE_FIXTURES / "draft.json")
        assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        assert check_article(_load(path)) == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_code(self, name: str) -> None:
        assert MANIFEST[name] in _codes(_load(ARTICLE_FIXTURES / "invalid" / name))

    def test_the_kitchen_sink_uses_every_standard_element(self) -> None:
        document = _load(ARTICLE_FIXTURES / "valid" / "kitchen-sink.json")
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        used = {node["type"] for node in document["nodes"].values()}
        assert used == set(schema["x-elements"])


def _paragraph_doc(**node: Any) -> dict[str, Any]:
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


class TestRefusals:
    def test_not_a_document_at_all(self) -> None:
        assert _codes("<p>hello</p>") and _codes({"nodes": []})

    def test_a_cycle_is_refused_not_followed(self) -> None:
        document = _paragraph_doc()
        document["nodes"]["n1"] = {
            "id": "n1",
            "type": "section",
            "v": 1,
            "props": {},
            "children": ["n1"],
        }
        assert _codes(document)

    def test_a_draft_tolerates_only_work_in_progress(self) -> None:
        # Unsafe URLs and a broken tree are never "in progress".
        assert "url.unsafe" not in DRAFT_TOLERATES
        assert "document.orphan" not in DRAFT_TOLERATES
        assert "media.external" in DRAFT_TOLERATES


class TestMediaRule:
    """Which keys a document may hold is the project's rule, passed in."""

    def _with_key(self, key: str) -> dict[str, Any]:
        document = _load(ARTICLE_FIXTURES / "valid" / "kitchen-sink.json")
        for node in document["nodes"].values():
            if node["type"] == "image" and node["props"].get("media"):
                node["props"]["media"]["key"] = key
                break
        return document

    @pytest.mark.parametrize(
        "key",
        ["../secrets/x.png", "/etc/passwd", "a/../b.png", "a\\b.png", "has space/x.png", ""],
    )
    def test_without_a_rule_a_bad_shape_is_refused(self, key: str) -> None:
        assert "media.invalidKey" in _codes(self._with_key(key))

    def test_without_a_rule_any_plain_key_passes(self) -> None:
        assert _codes(self._with_key("anything/2026/01/abc.png")) == set()

    def test_the_projects_rule_decides_and_names_the_code(self) -> None:
        def rule(key: str) -> str | None:
            return None if key.startswith("article-") else "media.wrongFolder"

        assert "media.wrongFolder" in _codes(
            self._with_key("brand-logo/2026/01/aaaaaaaaaaaaaaaa.png"), check_media_key=rule
        )
        assert "media.wrongFolder" not in _codes(
            self._with_key("article-image/2026/01/aaaaaaaaaaaaaaaa.png"), check_media_key=rule
        )


class TestHelpers:
    @pytest.mark.parametrize(
        ("url", "safe"),
        [
            ("https://example.com/a", True),
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

    def test_text_and_media(self) -> None:
        document = _load(ARTICLE_FIXTURES / "valid" / "kitchen-sink.json")
        assert plain_text(document)
        assert reading_minutes_of(document) >= 1
        assert "article-image/2026/01/cover00000000000.jpg" in media_keys(document)


def _with_languages(base: str, *others: str) -> dict[str, Any]:
    document = _load(ARTICLE_FIXTURES / "valid" / "empty.json")
    document["i18n"] = {
        "enabled": True,
        "base": base,
        "translations": {locale: {"meta": {"title": "x"}} for locale in others},
    }
    return document


def test_any_language_code_is_a_valid_document() -> None:
    """The contract lists no languages: a French or Brazilian article is well formed."""
    assert _codes(_with_languages("fr", "pt-BR")) == set()


def test_a_malformed_language_code_is_refused() -> None:
    assert "document.malformed" in _codes(_with_languages("French"))


def test_the_project_decides_which_languages_it_writes_in() -> None:
    document = _with_languages("sq", "en", "fr")
    issues = check_article(document, locales=("sq", "en", "de"))
    unknown = [issue for issue in issues if issue.code == "i18n.locale.unknown"]
    assert [issue.params for issue in unknown] == [{"locale": "fr"}]
    # A draft may hold it while the writer works; publishing refuses it.
    assert "i18n.locale.unknown" in DRAFT_TOLERATES
