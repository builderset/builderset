"""``check_card`` against ``@builderset/card``'s own fixtures.

Every valid fixture must pass, every invalid one be refused with exactly the
codes its manifest names — errors as errors, warnings as warnings — and every
case checked against a host's own member fields give exactly the issues
TypeScript gave: when the card builder and a Python backend disagree about
what a card may contain, one of these fails before anyone finds out.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from builderset.card import (
    DRAFT_TOLERATES,
    WARNINGS,
    check_card,
    is_draft_blocking,
    is_print_blocking,
    is_warning,
    media_keys,
)
from builderset.card.document import frame_bounds, is_unsafe_code_link, unencodable_chars
from builderset.card.schema import SCHEMA_PATH
from conftest import REPOSITORY

CARD_FIXTURES = REPOSITORY / "packages" / "card" / "fixtures"
VALID = sorted((CARD_FIXTURES / "valid").glob("*.json"))
MANIFEST: dict[str, dict[str, list[str]]] = json.loads(
    (CARD_FIXTURES / "invalid" / "manifest.json").read_text(encoding="utf-8")
)
FIELD_CASES: list[dict[str, Any]] = json.loads(
    (CARD_FIXTURES / "fields.json").read_text(encoding="utf-8")
)["cases"]
SCHEMA: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _sink() -> dict[str, Any]:
    return _load(CARD_FIXTURES / "valid" / "kitchen-sink.json")


def _codes(document: Any, **kwargs: Any) -> list[str]:
    return [issue.code for issue in check_card(document, **kwargs)]


def _node(document: dict[str, Any], node_type: str) -> dict[str, Any]:
    found: dict[str, Any] = next(
        node for node in document["nodes"].values() if node["type"] == node_type
    )
    return found


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "empty", "gold-membership"}
        assert len(VALID) >= 15
        assert len(MANIFEST) >= 20

    def test_a_draft_is_lenient_on_the_kits_codes_exactly(self) -> None:
        draft = _load(CARD_FIXTURES / "draft.json")
        assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)

    def test_the_warnings_are_the_ones_typescript_reports(self) -> None:
        reported = {code for case in MANIFEST.values() for code in case["warnings"]}
        assert reported == WARNINGS

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        if path.stem == "gym":
            return  # a host's own fields: the cases below
        issues = check_card(_load(path))
        if path.stem == "empty":
            # A new card, nothing on it yet: a draft, not yet something to print.
            assert sorted(issue.code for issue in issues) == ["side.empty", "side.empty"]
            assert not any(is_draft_blocking(issue) for issue in issues)
        else:
            assert issues == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_codes(self, name: str) -> None:
        issues = check_card(_load(CARD_FIXTURES / "invalid" / name))
        errors = sorted({issue.code for issue in issues if not is_warning(issue)})
        warnings = sorted({issue.code for issue in issues if is_warning(issue)})
        assert {"errors": errors, "warnings": warnings} == MANIFEST[name]

    @pytest.mark.parametrize("case", FIELD_CASES, ids=lambda case: case["name"])
    def test_a_hosts_own_fields_give_typescripts_issues_exactly(self, case: dict[str, Any]) -> None:
        document = _load(CARD_FIXTURES / "valid" / f"{case['card']}.json")
        issues = check_card(document, fields=case["fields"])
        got = [
            {
                "code": issue.code,
                "severity": "warning" if is_warning(issue) else "error",
                "nodeId": issue.node_id,
                "path": issue.path,
                "params": issue.params,
            }
            for issue in issues
        ]
        assert got == case["issues"]

    def test_the_kitchen_sink_uses_every_standard_element(self) -> None:
        used = {node["type"] for node in _sink()["nodes"].values()}
        assert used == set(SCHEMA["x-elements"])


class TestRules:
    def test_not_a_card_at_all(self) -> None:
        assert _codes("<card/>") == ["document.notJson"]
        assert set(_codes({"nodes": []})) == {"document.malformed"}

    @pytest.mark.parametrize(
        ("data", "unsafe"),
        [
            ("MA02481173", False),
            ("https://marrimauto.com/k/{{member.qr}}", False),
            ("tel:+355694002026", False),
            ("WIFI:T:WPA;S:Servisi;P:sekret;;", False),
            ("BEGIN:VCARD\nFN:Arben Hoxha\nEND:VCARD", False),
            ("javascript:alert(1)", True),
            (" JavaScript:alert(1)", True),
            ("java\tscript:alert(1)", True),
            ("java﻿script:alert(1)", True),
            ("data:text/html,<b>", True),
            ("https://marrimauto .com", True),
        ],
    )
    def test_what_a_qr_code_may_carry(self, data: str, unsafe: bool) -> None:
        assert is_unsafe_code_link(data) is unsafe

    def test_an_unsafe_link_blocks_even_a_draft(self) -> None:
        document = _sink()
        _node(document, "qr")["props"]["data"] = "javascript:alert(1)"
        issues = check_card(document)
        assert [issue.code for issue in issues] == ["url.unsafe"]
        assert is_draft_blocking(issues[0])
        assert is_print_blocking(issues[0])

    def test_a_rotated_frame_is_checked_by_the_box_it_covers(self) -> None:
        assert frame_bounds(20, 40, 30, 3, 0) == (20, 40, 50, 43)
        left, top, right, bottom = frame_bounds(20, 40, 30, 3, 90)
        assert (round(left, 6), round(top, 6), round(right, 6), round(bottom, 6)) == (
            33.5,
            26.5,
            36.5,
            56.5,
        )

    def test_the_barcode_names_what_it_cannot_carry(self) -> None:
        assert unencodable_chars("Kodi ë é ë") == ["ë", "é"]

    def test_warnings_never_block(self) -> None:
        issues = check_card(_load(CARD_FIXTURES / "invalid" / "every-warning.json"))
        warnings = [issue for issue in issues if is_warning(issue)]
        assert warnings
        assert not any(is_print_blocking(issue) or is_draft_blocking(issue) for issue in warnings)

    def test_media_keys_are_listed_and_held_to_the_projects_rule(self) -> None:
        document = _sink()
        assert media_keys(document) == ["card-image/2026/11/pattern.png"]
        refused = check_card(document, check_media_key=lambda key: "media.wrongFolder")
        assert [issue.code for issue in refused] == ["media.wrongFolder"]
        _node(document, "image")["props"]["media"]["key"] = "../secrets"
        assert _codes(document) == ["media.invalidKey"]

    def test_a_language_outside_the_projects_is_reported(self) -> None:
        document = _sink()
        document["i18n"] = {"enabled": True, "base": "sq", "translations": {"fr": {}}}
        assert _codes(document, locales=["sq", "en"]) == ["i18n.locale.unknown"]
