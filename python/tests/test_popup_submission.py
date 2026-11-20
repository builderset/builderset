"""``validate_submission`` against ``validateSubmission``'s own results.

``packages/popup/fixtures/submissions.json`` is written by the TypeScript
tests: each case a popup, what a visitor sent, and what ``validateSubmission``
decided. The browser and the server must decide the same.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from builderset.popup import validate_submission
from builderset.popup.submission import MAX_LENGTH, SUBMISSION_FORMAT_SOURCES
from conftest import REPOSITORY

POPUP_FIXTURES = REPOSITORY / "packages" / "popup" / "fixtures"
CASES: list[dict[str, Any]] = json.loads(
    (POPUP_FIXTURES / "submissions.json").read_text(encoding="utf-8")
)["cases"]
SCHEMA: dict[str, Any] = json.loads(
    (REPOSITORY / "packages" / "popup" / "schema" / "popup.schema.json").read_text(encoding="utf-8")
)


def _popup(name: str) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(
        (POPUP_FIXTURES / "valid" / f"{name}.json").read_text(encoding="utf-8")
    )
    return loaded


def test_there_are_enough_cases() -> None:
    assert len(CASES) >= 15


def test_the_formats_are_the_ones_ported() -> None:
    """A change to ``SUBMISSION_FORMATS`` in TS fails here until ``submission.py`` follows it."""
    published = {name: rule["source"] for name, rule in SCHEMA["x-submission-formats"].items()}
    assert published == SUBMISSION_FORMAT_SOURCES
    assert SCHEMA["x-submission-max-length"] == MAX_LENGTH


@pytest.mark.parametrize("case", CASES, ids=lambda case: str(case["name"]))
def test_each_case_gives_what_typescript_gives(case: dict[str, Any]) -> None:
    result = validate_submission(_popup(case["popup"]), case["values"])
    assert result.as_dict() == case["expected"]
    assert result.ok is (not result.errors)


def test_a_hidden_input_takes_no_answer() -> None:
    popup = _popup("valuation-modal")
    plate = next(node for node in popup["nodes"].values() if node["type"] == "input")
    assert not validate_submission(popup, {}).ok
    plate["hidden"] = True
    assert validate_submission(popup, {"plate": "AA 123 BC"}).as_dict() == {
        "ok": True,
        "errors": {},
        "values": {},
    }
