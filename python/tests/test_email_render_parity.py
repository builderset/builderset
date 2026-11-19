"""The Python renderer against the TS one, byte for byte.

``packages/email/src/render/golden.test.ts`` renders each case with the
renderer the editor previews with and writes the input and the output to
``packages/email/fixtures/golden/``. This renders the same input with the port
and compares. A failure means an email would be sent differently from how the
editor showed it.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from builderset.email import render_email, social_icon_url
from conftest import EMAIL_FIXTURES

GOLDEN = EMAIL_FIXTURES / "golden"
CASES = sorted(path.stem for path in GOLDEN.glob("*.json"))


def _first_difference(expected: str, actual: str) -> str:
    """Where two long strings part — far more useful than a 40 kB diff."""
    for index, (left, right) in enumerate(zip(expected, actual, strict=False)):
        if left != right:
            start = max(0, index - 80)
            return (
                f"at {index}:\n  expected …{expected[start : index + 80]!r}\n"
                f"  actual   …{actual[start : index + 80]!r}"
            )
    return f"lengths differ: expected {len(expected)}, actual {len(actual)}"


def test_there_are_fixtures() -> None:
    assert len(CASES) >= 5, "run the email golden test with UPDATE_FIXTURES=1"


@pytest.mark.parametrize("name", CASES)
def test_renders_like_the_editor(name: str) -> None:
    case: dict[str, Any] = json.loads((GOLDEN / f"{name}.json").read_text(encoding="utf-8"))
    base = case["assetBase"]
    rendered = render_email(
        case["document"],
        asset_url=lambda key: f"{base}{key}",
        brand=case["brand"],
        data=case["data"],
        locale=case["locale"],
        currency=case["currency"],
        social_icon=social_icon_url(case["iconBase"]),
    )
    html = (GOLDEN / f"{name}.html").read_text(encoding="utf-8")
    text = (GOLDEN / f"{name}.txt").read_text(encoding="utf-8")

    assert rendered.subject == case["expected"]["subject"]
    assert rendered.preheader == case["expected"]["preheader"]
    assert rendered.html == html, _first_difference(html, rendered.html)
    assert rendered.text == text, _first_difference(text, rendered.text)
