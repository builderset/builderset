"""A visitor's answers, checked the way the form says — ``answers.ts`` in Python.

Which fields show (logic), which must be answered, and what each answer must
look like: the renderer checks a step in the browser before moving on, and the
server checks the whole submission again with :func:`validate_answers`. The two
must agree on every answer, so this is a port rule for rule, including the
places where JavaScript reads a value its own way (``Number("0x10")`` is 16, an
emoji is two characters long); ``packages/form/fixtures/answers.json`` holds
the TypeScript results and the tests hold this module to them.

What a field takes is read from the form's JSON Schema (``x-answer-kinds``),
not restated here.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections.abc import Mapping
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from builderset.form import _js
from builderset.form.schema import answer_kinds

#: The shapes of ``ANSWER_FORMATS`` in ``answers.ts``, as Python patterns. The
#: tests compare the TypeScript sources (``x-answer-formats``) with
#: :data:`ANSWER_FORMAT_SOURCES`, so a change there fails here until it is ported.
ANSWER_FORMAT_SOURCES = {
    "email": r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$",
    "phone": r"^\+?[\d\s().-]{6,24}$",
    "letters": r"^[\p{L}\s'" + "\N{RIGHT SINGLE QUOTATION MARK}" + r"-]+$",
    "digits": r"^\d+$",
    "date": r"^\d{4}-\d{2}-\d{2}$",
    "time": r"^\d{2}:\d{2}$",
}

# Without the `u` flag JavaScript's `\d` is 0-9 only and its `\s` is _js.WS;
# the answer is matched as UTF-16 (`_js.utf16`), as JavaScript sees it.
_EMAIL = re.compile(f"[^{_js.WS}@]+@[^{_js.WS}@]+\\.[^{_js.WS}@]{{2,}}")
_PHONE = re.compile(f"\\+?[0-9{_js.WS}().\\-]{{6,24}}")
_DIGITS = re.compile("[0-9]+")
_DATE = re.compile("[0-9]{4}-[0-9]{2}-[0-9]{2}")
_TIME = re.compile("[0-9]{2}:[0-9]{2}")
#: `[\p{L}\s'\u2019-]` with the `u` flag: a letter of any alphabet, whitespace, an apostrophe, a hyphen.
_LETTER_EXTRAS = frozenset(_js.WHITESPACE + "'\N{RIGHT SINGLE QUOTATION MARK}-")

Answers = Mapping[str, Any]

#: Fields that take one choice: a list sent for them is refused, not read as text.
_ONE_CHOICE = frozenset({"select", "radio", "yes-no"})


# ── the form's fields ──────────────────────────────────────────


@dataclass(frozen=True)
class FormField:
    """A field (or a block) of the form, with the step it is on."""

    node: dict[str, Any]
    step: dict[str, Any]
    step_index: int


def _nodes(document: Mapping[str, Any]) -> dict[str, Any]:
    nodes = document.get("nodes")
    return nodes if isinstance(nodes, dict) else {}


def _children(node: Any) -> list[Any]:
    children = node.get("children") if isinstance(node, dict) else None
    return children if isinstance(children, list) else []


def _props(node: dict[str, Any]) -> dict[str, Any]:
    props = node.get("props")
    return props if isinstance(props, dict) else {}


def steps_of(document: Mapping[str, Any]) -> list[dict[str, Any]]:
    """The steps, in order: ``stepsOf``."""
    nodes = _nodes(document)
    root_id = document.get("root")
    root = nodes.get(root_id) if isinstance(root_id, str) else None
    steps: list[dict[str, Any]] = []
    for node_id in _children(root):
        node = nodes.get(node_id) if isinstance(node_id, str) else None
        if isinstance(node, dict) and node.get("type") == "step":
            steps.append(node)
    return steps


def form_fields(document: Mapping[str, Any]) -> list[FormField]:
    """Every field and block, step by step, in order: ``formFields``."""
    nodes = _nodes(document)
    fields: list[FormField] = []
    for index, step in enumerate(steps_of(document)):
        for node_id in _children(step):
            node = nodes.get(node_id) if isinstance(node_id, str) else None
            if isinstance(node, dict):
                fields.append(FormField(node=node, step=step, step_index=index))
    return fields


def takes_answer(node: Mapping[str, Any]) -> bool:
    """Whether a node is a field that takes an answer: it has a key."""
    props = node.get("props")
    return isinstance(props, dict) and isinstance(props.get("key"), str)


def answer_kind_of(field_type: str) -> str:
    """``answerKindOf``: ``text``, ``number``, ``list``, ``name``, ``address``, ``boolean``,
    ``files`` or ``none``."""
    return answer_kinds().get(field_type, "none")


# ── logic ──────────────────────────────────────────────────────


def _as_text(value: Any) -> str:
    """``asText``: an answer as the words logic compares."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool) or _js.is_number(value):
        return _js.to_string(value)
    if isinstance(value, list):
        return ", ".join(_as_text(item) for item in value)
    if isinstance(value, dict):
        return _js.trim(" ".join(_as_text(item) for item in _js.object_values(value)))
    return ""


def is_empty(value: Any) -> bool:
    """No answer: nothing, an empty string, no choice, an unticked box, a blank name."""
    if value is None or value is False:
        return True
    if isinstance(value, str):
        return _js.trim(value) == ""
    if isinstance(value, list):
        return len(value) == 0
    if isinstance(value, dict):
        return all(is_empty(item) for item in value.values())
    return False


def rule_matches(rule: Mapping[str, Any], answers: Answers) -> bool:
    """Whether one rule holds for the answers given so far: ``ruleMatches``."""
    key = rule.get("key")
    answer = answers.get(key) if isinstance(key, str) else None
    expected = rule.get("value")
    expected = expected if isinstance(expected, str) else _js.to_string(expected)
    text = _as_text(answer)
    op = rule.get("op")
    if op == "is":
        return expected in answer if isinstance(answer, list) else text == expected
    if op == "is_not":
        return expected not in answer if isinstance(answer, list) else text != expected
    if op == "contains":
        return expected.lower() in text.lower()
    if op == "empty":
        return is_empty(answer)
    if op == "not_empty":
        return not is_empty(answer)
    # Numbers only: an empty answer, or one that is not a number (NaN), matches neither.
    if op == "gt":
        return not is_empty(answer) and _js.to_number(text) > _js.to_number(expected)
    if op == "lt":
        return not is_empty(answer) and _js.to_number(text) < _js.to_number(expected)
    return False


def is_shown(props: Mapping[str, Any], answers: Answers) -> bool:
    """Whether a field shows, given the answers so far. Its logic off: always."""
    logic = props.get("logic")
    if not isinstance(logic, dict) or logic.get("enabled") is not True:
        return True
    rules = logic.get("rules")
    if not isinstance(rules, list) or not rules:
        return True
    matches = (isinstance(rule, dict) and rule_matches(rule, answers) for rule in rules)
    return all(matches) if logic.get("match") == "all" else any(matches)


# ── errors ─────────────────────────────────────────────────────


@dataclass(frozen=True)
class AnswerError:
    """Why an answer is refused — ``AnswerError`` in TS.

    ``code`` is one of ``required``, ``email``, ``phone``, ``number``, ``date``,
    ``time``, ``tooShort``, ``tooLong``, ``tooLow``, ``tooHigh``, ``letters``,
    ``digits``, ``pattern``, ``choice``, ``tooFewChoices``, ``tooManyChoices``,
    ``tooManyFiles``, ``fileType``, ``fileTooBig``. ``limit`` fills "at least
    {limit}"; ``message`` is the form's own words for the field's errors.
    """

    code: str
    limit: int | float | None = None
    message: str | None = None

    def as_dict(self) -> dict[str, Any]:
        """The TS shape: ``limit`` and ``message`` only when they are set."""
        shaped: dict[str, Any] = {"code": self.code}
        if self.limit is not None:
            shaped["limit"] = self.limit
        if self.message is not None:
            shaped["message"] = self.message
        return shaped


@dataclass(frozen=True)
class AnswersResult:
    """What :func:`validate_answers` decided.

    ``errors``: by field key, the first thing wrong with its answer. ``values``:
    the answers to keep — shown fields only, numbers as numbers, nothing the
    form does not ask.
    """

    ok: bool
    errors: dict[str, AnswerError] = field(default_factory=dict)
    values: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        """``{ok, errors: {key: {code, limit?, message?}}, values}``, as TS returns it."""
        return {
            "ok": self.ok,
            "errors": {key: error.as_dict() for key, error in self.errors.items()},
            "values": dict(self.values),
        }


def _number(value: Any) -> int | float | None:
    """A bound from the form's props: a number, or none (``null``, missing)."""
    return value if _js.is_number(value) else None


def _is_letters(text: str) -> bool:
    return bool(text) and all(
        unicodedata.category(char).startswith("L") or char in _LETTER_EXTRAS for char in text
    )


#: `(?<name>` and `\k<name>` — JavaScript's named groups — where not escaped.
_NAMED_GROUP = re.compile(r"(?<!\\)((?:\\\\)*)\(\?<(?![=!])")
_NAMED_BACKREFERENCE = re.compile(r"(?<!\\)((?:\\\\)*)\\k<([A-Za-z_][A-Za-z0-9_]*)>")


@lru_cache(maxsize=256)
def custom_pattern(source: str) -> re.Pattern[str] | None:
    """A form's own pattern (``checks.regex``), compiled by Python's ``re`` — None when
    it does not compile.

    TypeScript compiles it as a JavaScript ``RegExp`` without flags. The two
    agree on what people write for a plate or a code: classes, quantifiers,
    anchors, groups, alternation, lookahead. ``re.ASCII`` keeps ``\\d`` and ``\\w``
    to ASCII as JavaScript's are, and named groups are rewritten to Python's
    spelling. They still differ on exotic syntax — ``\\p{…}`` (a literal ``p``
    to JavaScript without the ``u`` flag), escapes such as ``\\a`` or ``\\cX``,
    variable-length lookbehind, ``[^]`` — where a pattern only one of them
    compiles is reported as ``field.patternInvalid`` by that one alone.
    """
    translated = _NAMED_BACKREFERENCE.sub(r"\1(?P=\2)", _NAMED_GROUP.sub(r"\1(?P<", source))
    try:
        return re.compile(translated, re.ASCII)
    except (re.error, ValueError, OverflowError, RecursionError):
        return None


def _text_checks(text: str, checks: Mapping[str, Any]) -> AnswerError | None:
    units = _js.utf16(text)
    min_length = _number(checks.get("minLength"))
    max_length = _number(checks.get("maxLength"))
    if min_length is not None and len(units) < min_length:
        return AnswerError("tooShort", limit=min_length)
    if max_length is not None and len(units) > max_length:
        return AnswerError("tooLong", limit=max_length)
    pattern = checks.get("pattern")
    if pattern == "letters" and not _is_letters(text):
        return AnswerError("letters")
    if pattern == "digits" and not _DIGITS.fullmatch(text):
        return AnswerError("digits")
    regex = checks.get("regex")
    if pattern == "custom" and isinstance(regex, str) and regex:
        compiled = custom_pattern(regex)
        # A broken pattern is the designer's mistake, reported before publishing.
        if compiled is not None and not compiled.search(units):
            return AnswerError("pattern")
    return None


def _range_checks(value: float, low: Any, high: Any) -> AnswerError | None:
    minimum, maximum = _number(low), _number(high)
    if minimum is not None and value < minimum:
        return AnswerError("tooLow", limit=minimum)
    if maximum is not None and value > maximum:
        return AnswerError("tooHigh", limit=maximum)
    return None


def _part(value: Any, name: str) -> Any:
    """``value.first``: a part of an object answer; anything else has none."""
    return value.get(name) if isinstance(value, dict) else None


def _options(props: Mapping[str, Any]) -> list[Any]:
    options = props.get("options")
    return options if isinstance(options, list) else []


def _file_issue(file: Any, props: Mapping[str, Any]) -> AnswerError | None:
    name = _part(file, "name")
    if not isinstance(name, str):
        # A file is an object with a name; anything else is a file of no type.
        return AnswerError("fileType")
    extension = name.split(".")[-1].lower()
    accept = props.get("accept")
    if isinstance(accept, list) and accept and extension not in accept:
        return AnswerError("fileType")
    if isinstance(file, dict) and "size" in file:
        max_mb = _number(props.get("maxMb"))
        if max_mb is not None and _js.loose_number(file["size"]) > max_mb * 1024 * 1024:
            return AnswerError("fileTooBig", limit=max_mb)
    return None


def check_answer(field_type: str, props: Mapping[str, Any], value: Any) -> AnswerError | None:
    """The first thing wrong with one answer, or None — ``checkAnswer``.

    ``props`` are the field's. A field that does not show is never checked
    (see :func:`validate_answers`).
    """
    checks = props.get("checks")
    checks = checks if isinstance(checks, dict) else None
    required = props.get("required") is True and props.get("hideFromVisitors") is not True
    message = checks.get("message") if checks is not None else None

    def with_message(found: AnswerError | None) -> AnswerError | None:
        if found is not None and isinstance(message, str) and message:
            return AnswerError(found.code, limit=found.limit, message=message)
        return found

    if is_empty(value):
        return with_message(AnswerError("required")) if required else None

    kind = answer_kind_of(field_type)
    if kind == "text":
        # One choice is one string; a list of them is not an answer to it.
        if field_type in _ONE_CHOICE and isinstance(value, list):
            return with_message(AnswerError("choice"))
        text = _js.trim(_as_text(value))
        units = _js.utf16(text)
        if field_type == "email" and not _EMAIL.fullmatch(units):
            return with_message(AnswerError("email"))
        if field_type == "phone" and not _PHONE.fullmatch(units):
            return with_message(AnswerError("phone"))
        if field_type == "date" and not _DATE.fullmatch(units):
            return with_message(AnswerError("date"))
        if field_type == "time" and not _TIME.fullmatch(units):
            return with_message(AnswerError("time"))
        if field_type in {"select", "radio"}:
            return None if text in _options(props) else with_message(AnswerError("choice"))
        if field_type == "yes-no" and text not in {"yes", "no"}:
            return with_message(AnswerError("choice"))
        return with_message(_text_checks(text, checks)) if checks is not None else None

    if kind == "number":
        number = (
            _js.as_float(value)
            if _js.is_number(value)
            else _js.to_number(_js.without_whitespace(_as_text(value)))
        )
        if not math.isfinite(number):
            return with_message(AnswerError("number"))
        if field_type == "rating":
            return with_message(_range_checks(number, 1, props.get("stars")))
        if field_type == "scale":
            return with_message(_range_checks(number, props.get("from"), props.get("to")))
        if field_type == "slider":
            return with_message(_range_checks(number, props.get("min"), props.get("max")))
        if checks is None:
            return None
        return with_message(_range_checks(number, checks.get("min"), checks.get("max")))

    if kind == "list":
        if not isinstance(value, list):
            return with_message(AnswerError("choice"))
        options = _options(props)
        if any(not isinstance(item, str) or item not in options for item in value):
            return with_message(AnswerError("choice"))
        fewest = _number(checks.get("min")) if checks is not None else None
        most = _number(checks.get("max")) if checks is not None else None
        if fewest is not None and len(value) < fewest:
            return with_message(AnswerError("tooFewChoices", limit=fewest))
        if most is not None and len(value) > most:
            return with_message(AnswerError("tooManyChoices", limit=most))
        return None

    if kind == "name":
        missing = required and is_empty(_part(value, "first"))
        return with_message(AnswerError("required")) if missing else None

    if kind == "address":
        missing = required and (is_empty(_part(value, "street")) or is_empty(_part(value, "city")))
        return with_message(AnswerError("required")) if missing else None

    if kind == "boolean":
        return None if value is True else with_message(AnswerError("required"))

    if kind == "files":
        if not isinstance(value, list):
            return with_message(AnswerError("required"))
        max_files = _number(props.get("maxFiles"))
        if max_files is not None and len(value) > max_files:
            return with_message(AnswerError("tooManyFiles", limit=max_files))
        for file in value:
            found = _file_issue(file, props)
            if found is not None:
                return with_message(found)
        return None

    return None


def validate_answers(
    document: Mapping[str, Any], answers: Answers, *, step: int | None = None
) -> AnswersResult:
    """Check a submission against the form — ``validateAnswers``.

    With ``step``, only that step's fields (the renderer's "Continue"); without,
    every step (the server). Fields hidden by logic are skipped and their
    answers dropped: a question the visitor never saw cannot be required, and
    its stale answer is not kept. Answers that are not a mapping are read as
    no answers at all.

    The document is trusted to be a valid form (one :func:`check_form` accepts).
    """
    given: Answers = answers if isinstance(answers, Mapping) else {}
    errors: dict[str, AnswerError] = {}
    values: dict[str, Any] = {}
    for form_field in form_fields(document):
        if step is not None and form_field.step_index != step:
            continue
        node = form_field.node
        if not takes_answer(node):
            continue
        props = _props(node)
        key: str = props["key"]
        node_type = str(node.get("type"))
        # Logic reads the answers as sent; hidden fields' answers are kept as they are.
        if node_type != "hidden" and not is_shown(props, given):
            continue
        value = given.get(key)
        found = None if node_type == "hidden" else check_answer(node_type, props, value)
        if found is not None:
            errors[key] = found
            continue
        if is_empty(value):
            continue
        if answer_kind_of(node_type) == "number" and isinstance(value, str):
            values[key] = _js.to_number_or_int(_js.to_number(_js.without_whitespace(value)))
        else:
            values[key] = value
    return AnswersResult(ok=not errors, errors=errors, values=values)


__all__ = [
    "ANSWER_FORMAT_SOURCES",
    "AnswerError",
    "Answers",
    "AnswersResult",
    "FormField",
    "answer_kind_of",
    "check_answer",
    "custom_pattern",
    "form_fields",
    "is_empty",
    "is_shown",
    "rule_matches",
    "steps_of",
    "takes_answer",
    "validate_answers",
]
