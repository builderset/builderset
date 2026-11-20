"""``validate_answers`` against ``validateAnswers``' own results.

``packages/form/fixtures/answers.json`` is written by the TypeScript tests:
each case a form (a valid fixture's name, or the form itself), what a visitor
sent, and what ``validateAnswers`` decided. The browser and the server must
decide the same, so every case must come out exactly so here.
"""

from __future__ import annotations

import json
import math
from typing import Any

import pytest

from builderset.form import AnswerError, check_answer, form_fields, is_shown, steps_of
from builderset.form import validate_answers as validate
from builderset.form._js import number_to_string, to_number
from conftest import FORM_FIXTURES

CASES: list[dict[str, Any]] = json.loads(
    (FORM_FIXTURES / "answers.json").read_text(encoding="utf-8")
)["cases"]


def _form(case: dict[str, Any]) -> dict[str, Any]:
    form = case["form"]
    if isinstance(form, str):
        loaded: dict[str, Any] = json.loads(
            (FORM_FIXTURES / "valid" / f"{form}.json").read_text(encoding="utf-8")
        )
        return loaded
    inline: dict[str, Any] = form
    return inline


def test_there_are_enough_cases() -> None:
    assert len(CASES) >= 25


@pytest.mark.parametrize("case", CASES, ids=lambda case: str(case["name"]))
def test_each_case_gives_what_typescript_gives(case: dict[str, Any]) -> None:
    result = validate(_form(case), case["answers"], step=case.get("step"))
    assert result.as_dict() == case["expected"]
    assert result.ok is (not result.errors)


def _sink() -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(
        (FORM_FIXTURES / "valid" / "kitchen-sink.json").read_text(encoding="utf-8")
    )
    return loaded


def test_numbers_are_kept_as_json_would_carry_them() -> None:
    result = validate(_sink(), {"year": " 2 019 ", "budget": "1e4"})
    assert result.values["year"] == 2019 and isinstance(result.values["year"], int)
    assert result.values["budget"] == 10000


def test_answers_that_are_not_a_mapping_are_no_answers() -> None:
    result = validate(_sink(), ["not", "answers"])  # type: ignore[arg-type]
    assert not result.ok and result.errors["email"].code == "required"


def test_steps_and_fields() -> None:
    document = _sink()
    assert [step["props"]["title"] for step in steps_of(document)] == [
        "About you",
        "The car",
        "Photos",
    ]
    fields = form_fields(document)
    assert fields[0].node["props"]["key"] == "name" and fields[0].step_index == 0
    assert fields[-1].node["type"] == "consent" and fields[-1].step_index == 2


def test_check_answer_and_is_shown() -> None:
    props = {"required": True, "checks": {"message": "Say something"}}
    assert check_answer("text", props, " ") == AnswerError("required", message="Say something")
    assert check_answer("heading", {}, "anything") is None
    logic = {"enabled": True, "match": "any", "rules": [{"key": "a", "op": "is", "value": "x"}]}
    assert is_shown({"logic": logic}, {"a": ["x", "y"]})
    assert not is_shown({"logic": logic}, {"a": "y"})
    assert is_shown({"logic": {**logic, "enabled": False}}, {})


@pytest.mark.parametrize(
    ("text", "number"),
    [
        ("", 0),
        ("  12 ", 12),
        ("0x1A", 26),
        ("0b101", 5),
        ("0o17", 15),
        ("-0x1A", math.nan),
        ("1_000", math.nan),
        ("nan", math.nan),
        ("infinity", math.nan),
        ("-Infinity", -math.inf),
        (".5", 0.5),
        ("5.", 5),
        ("1e3", 1000),
    ],
)
def test_strings_become_numbers_as_in_javascript(text: str, number: float) -> None:
    found = to_number(text)
    assert (math.isnan(found) and math.isnan(number)) or found == number


@pytest.mark.parametrize(
    ("number", "text"),
    [
        (1, "1"),
        (1.0, "1"),
        (-0.0, "0"),
        (1.5, "1.5"),
        (0.000001, "0.000001"),
        (1e-7, "1e-7"),
        (1e21, "1e+21"),
        (123456789012345680000, "123456789012345680000"),
        (1.2345e-10, "1.2345e-10"),
        (2**60, "1152921504606847000"),
        (math.inf, "Infinity"),
    ],
)
def test_numbers_become_strings_as_in_javascript(number: float, text: str) -> None:
    assert number_to_string(number) == text


def test_a_file_without_a_name_is_refused_not_a_crash() -> None:
    """A file is an object with a name; anything else is a file of no type, as in TS."""
    result = validate(_sink(), {"photos": [{"size": 10}, "a.jpg"]})
    assert result.errors["photos"] == AnswerError("fileType")


def test_named_groups_are_read_as_javascript_writes_them() -> None:
    props = {"checks": {"pattern": "custom", "regex": r"^(?<l>[A-Z])\k<l>$", "message": ""}}
    assert check_answer("text", props, "AA") is None
    assert check_answer("text", props, "AB") == AnswerError("pattern")
