"""``check_popup`` against ``@builderset/popup``'s own fixtures.

Every valid fixture must pass, and every invalid one be refused with exactly
the codes its manifest names — errors as errors, warnings as warnings — as the
TypeScript checker does: when the popup builder and a Python backend disagree
about what a popup may contain, one of these fails before anyone finds out.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from builderset.popup import (
    DRAFT_TOLERATES,
    can_close,
    check_popup,
    is_draft_blocking,
    is_publish_blocking,
    is_warning,
    media_keys,
)
from builderset.popup.schema import SCHEMA_PATH, default_variables
from conftest import REPOSITORY

POPUP_FIXTURES = REPOSITORY / "packages" / "popup" / "fixtures"
VALID = sorted((POPUP_FIXTURES / "valid").glob("*.json"))
MANIFEST: dict[str, dict[str, list[str]]] = json.loads(
    (POPUP_FIXTURES / "invalid" / "manifest.json").read_text(encoding="utf-8")
)
SCHEMA: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _sink() -> dict[str, Any]:
    return _load(POPUP_FIXTURES / "valid" / "kitchen-sink.json")


def _codes(document: Any, **kwargs: Any) -> set[str]:
    return {issue.code for issue in check_popup(document, **kwargs)}


def _node(document: dict[str, Any], node_type: str) -> dict[str, Any]:
    found: dict[str, Any] = next(
        node for node in document["nodes"].values() if node["type"] == node_type
    )
    return found


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "valuation-modal", "cookie-bar"}
        assert len(VALID) >= 15
        assert len(MANIFEST) >= 20

    def test_a_draft_is_lenient_on_the_kits_codes_exactly(self) -> None:
        draft = _load(POPUP_FIXTURES / "draft.json")
        assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        assert check_popup(_load(path)) == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_codes(self, name: str) -> None:
        issues = check_popup(_load(POPUP_FIXTURES / "invalid" / name))
        errors = sorted({issue.code for issue in issues if not is_warning(issue)})
        warnings = sorted({issue.code for issue in issues if is_warning(issue)})
        assert {"errors": errors, "warnings": warnings} == MANIFEST[name]

    def test_the_kitchen_sink_uses_every_placed_element(self) -> None:
        used = {node["type"] for node in _sink()["nodes"].values()}
        assert used == set(SCHEMA["x-elements"])

    def test_the_default_variables_are_published(self) -> None:
        assert default_variables() == ("visitor.first_name", "page.title", "offer.ends")


class TestRefusals:
    def test_not_a_popup_at_all(self) -> None:
        assert _codes("<div></div>") == {"document.notJson"}
        assert _codes({"nodes": []}) == {"document.malformed"}

    def test_a_link_to_a_path_here_or_a_web_address_is_fine(self) -> None:
        for url in ("/vleresim", "https://example.com/oferta", "#oferta"):
            document = _sink()
            button = next(
                node
                for node in document["nodes"].values()
                if node["type"] == "button" and node["props"]["action"] == "link"
            )
            button["props"]["url"] = url
            assert _codes(document) == set(), url

    @pytest.mark.parametrize("url", ["javascript:alert(1)", "//evil.test/x", "data:text/html,x"])
    def test_an_unsafe_link_is_refused_even_in_a_draft(self, url: str) -> None:
        document = _sink()
        _node(document, "text")["props"].update(action="link", url=url)
        issues = check_popup(document)
        assert [issue.code for issue in issues] == ["url.unsafe"]
        assert is_draft_blocking(issues[0])

    def test_closing_counts_the_page_behind_only_where_there_is_one(self) -> None:
        document = _sink()
        root = document["nodes"]["root"]["props"]
        root["motion"].update(closeX=False, esc=False)
        for node in document["nodes"].values():
            if node["props"].get("action") == "close":
                node["props"]["action"] = "none"
        assert can_close(document)  # a modal: the dimmed page closes it
        root["type"] = "slidein"
        assert not can_close(document)
        assert "popup.noClose" in _codes(document)
        root["type"] = "inline"
        assert "popup.noClose" not in _codes(document)

    def test_the_projects_variables_replace_the_defaults(self) -> None:
        assert _codes(_sink(), variables=["visitor.first_name"]) == {"variable.unknown"}

    def test_warnings_never_block(self) -> None:
        issues = check_popup(_load(POPUP_FIXTURES / "invalid" / "every-warning.json"))
        warnings = [issue for issue in issues if is_warning(issue)]
        assert len({issue.code for issue in warnings}) == 7
        assert not any(is_publish_blocking(issue) or is_draft_blocking(issue) for issue in warnings)


class TestProject:
    def test_media_keys_and_the_projects_rule(self) -> None:
        assert media_keys(_sink()) == ["popup-image/2026/11/car.jpg"]

        def rule(key: str) -> str | None:
            return None if key.startswith("popup-image/") else "media.wrongFolder"

        document = _sink()
        assert _codes(document, check_media_key=rule) == set()
        _node(document, "image")["props"]["media"]["key"] = "brand/logo.png"
        assert _codes(document, check_media_key=rule) == {"media.wrongFolder"}

    def test_the_project_decides_which_languages_it_writes_in(self) -> None:
        document = copy.deepcopy(_sink())
        document["i18n"] = {"enabled": True, "base": "sq", "translations": {"fr": {}}}
        issues = check_popup(document, locales=("sq", "en"))
        assert [(issue.code, issue.params) for issue in issues] == [
            ("i18n.locale.unknown", {"locale": "fr"})
        ]
