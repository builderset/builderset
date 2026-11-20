"""``fill_card`` and ``fields_used`` against ``fillCard`` and ``fieldsUsed`` in TypeScript.

A backend issues a card to a member with the member's data frozen; the copy
it stores must say exactly what the page draws. ``filled.json`` holds the
TypeScript results for real designs and members.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from builderset.card import check_card, fields_used, fill_card, fill_text
from conftest import REPOSITORY

CARD_FIXTURES = REPOSITORY / "packages" / "card" / "fixtures"
CASES: list[dict[str, Any]] = json.loads(
    (CARD_FIXTURES / "filled.json").read_text(encoding="utf-8")
)["cases"]


def _card(name: str) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(
        (CARD_FIXTURES / "valid" / f"{name}.json").read_text(encoding="utf-8")
    )
    return loaded


@pytest.mark.parametrize("case", CASES, ids=lambda case: f"{case['card']}")
def test_a_card_is_filled_as_typescript_fills_it(case: dict[str, Any]) -> None:
    document = _card(case["card"])
    assert fields_used(document) == case["fields"]
    filled = fill_card(document, case["record"])
    assert filled == case["filled"]
    assert document == _card(case["card"])  # the design itself is untouched


def test_a_filled_card_still_passes_its_checks() -> None:
    filled = fill_card(_card("gold-membership"), CASES[1]["record"])
    assert check_card(filled) == []


def test_fill_text_leaves_what_the_record_lacks() -> None:
    record = {"member.name": "Arben Hoxha"}
    assert fill_text("Hi {{ member.name }}, {{member.tier}}", record) == (
        "Hi Arben Hoxha, {{member.tier}}"
    )
    assert fill_text("{{member.name}}", None) == "{{member.name}}"
    assert fill_text("{{constructor}}", record) == "{{constructor}}"
