"""What a visitor sends from a popup, checked — ``submission.ts`` in Python.

The popup in the browser checks its inputs before it calls ``onSubmit``; the
server checks again with :func:`validate_submission`, and the two must agree
on every answer. ``packages/popup/fixtures/submissions.json`` holds the
TypeScript results and the tests hold this module to them. Lengths are counted
and whitespace trimmed the way JavaScript does it (``builderset.form._js``).
"""

from __future__ import annotations

import re
from collections.abc import Mapping
from dataclasses import dataclass, field
from typing import Any

from builderset.form import _js
from builderset.popup.document import elements_of

#: The shapes of ``SUBMISSION_FORMATS`` in ``submission.ts``. The tests compare
#: the TypeScript sources (``x-submission-formats``) with these, so a change
#: there fails here until it is ported.
SUBMISSION_FORMAT_SOURCES = {
    "email": r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$",
    "tel": r"^\+?[\d\s().-]{6,24}$",
    "plate": r"^[A-Za-z0-9](?:[A-Za-z0-9]|[ -](?=[A-Za-z0-9])){1,11}$",
}

#: The longest answer an input takes, in UTF-16 units (``x-submission-max-length``).
MAX_LENGTH = 500

# Without the `u` flag JavaScript's `\d` is 0-9 only and its `\s` is _js.WS.
_FORMATS = {
    "email": re.compile(f"[^{_js.WS}@]+@[^{_js.WS}@]+\\.[^{_js.WS}@]{{2,}}"),
    "tel": re.compile(f"\\+?[0-9{_js.WS}().\\-]{{6,24}}"),
    "plate": re.compile("[A-Za-z0-9](?:[A-Za-z0-9]|[ -](?=[A-Za-z0-9])){1,11}"),
}
_CODES = {"email": "email", "tel": "phone", "plate": "plate"}


@dataclass(frozen=True)
class SubmissionError:
    """Why an answer is refused: ``required``, ``text``, ``tooLong``, ``email``, ``phone``, ``plate``."""

    code: str
    limit: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return (
            {"code": self.code} if self.limit is None else {"code": self.code, "limit": self.limit}
        )


@dataclass(frozen=True)
class SubmissionResult:
    ok: bool
    #: By input name, the first thing wrong with its answer.
    errors: dict[str, SubmissionError] = field(default_factory=dict)
    #: The answers to keep: the popup's own inputs only, trimmed.
    values: dict[str, str] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "errors": {name: error.as_dict() for name, error in self.errors.items()},
            "values": self.values,
        }


def inputs_of(popup: dict[str, Any]) -> list[dict[str, Any]]:
    """The inputs a visitor sees, in stacking order: hidden ones take no answer."""
    return [
        node
        for node in elements_of(popup)
        if node.get("type") == "input" and not node.get("hidden")
    ]


def check_value(props: Mapping[str, Any], value: Any) -> SubmissionError | None:
    """The first thing wrong with one answer, or ``None``."""
    required = props.get("required") is True
    if value is None:
        return SubmissionError("required") if required else None
    if not isinstance(value, str):
        return SubmissionError("text")
    text = _js.trim(value)
    if not text:
        return SubmissionError("required") if required else None
    if _js.length(text) > MAX_LENGTH:
        return SubmissionError("tooLong", MAX_LENGTH)
    kind = props.get("kind")
    if kind in _FORMATS and not _FORMATS[kind].fullmatch(_js.utf16(text)):
        return SubmissionError(_CODES[kind])
    return None


def validate_submission(popup: dict[str, Any], values: Any) -> SubmissionResult:
    """Check what was sent against the popup's inputs.

    Answers to names the popup does not ask are dropped; two inputs with one
    name (``check_popup`` refuses that) are read as the first. Anything but a
    mapping of answers is no answers: every required input is missing.
    """
    answers: Mapping[str, Any] = values if isinstance(values, Mapping) else {}
    errors: dict[str, SubmissionError] = {}
    kept: dict[str, str] = {}
    done: set[str] = set()
    for node in inputs_of(popup):
        props = node.get("props") or {}
        name = props.get("name")
        if not isinstance(name, str) or not name or name in done:
            continue
        done.add(name)
        value = answers.get(name)
        found = check_value(props, value)
        if found:
            errors[name] = found
        elif isinstance(value, str) and _js.trim(value):
            kept[name] = _js.trim(value)
    return SubmissionResult(ok=not errors, errors=errors, values=kept)


__all__ = [
    "MAX_LENGTH",
    "SUBMISSION_FORMAT_SOURCES",
    "SubmissionError",
    "SubmissionResult",
    "check_value",
    "inputs_of",
    "validate_submission",
]
