"""The Python renderer against the TS one, byte for byte.

The TS renderer the editor previews with renders each case, and the input
and the output are here: the email kit's neutral cases in ``golden/kit/``
(shipped by ``@builderset/email``, copied by ``scripts/sync-builder-contract.mjs``),
MotorsAL's designs in ``golden/motors/`` (``packages/builder-presets/src/golden.test.ts``).
This renders the same input with the port and compares. A failure means an
email would be sent differently from how the editor showed it.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.domains.email_builder.render import render_email, social_icon_url

GOLDEN = Path(__file__).resolve().parents[1] / "fixtures" / "email" / "golden"
#: ``kit/<name>`` and ``motors/<name>``.
CASES = sorted(
    f"{folder}/{path.stem}"
    for folder in ("kit", "motors")
    for path in (GOLDEN / folder).glob("*.json")
)
DESIGNS = GOLDEN / "motors"


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
    kit = [case for case in CASES if case.startswith("kit/")]
    assert len(kit) >= 5, "run node scripts/sync-builder-contract.mjs"
    assert len(CASES) > len(kit), (
        "run the @motors/builder-presets golden test with UPDATE_FIXTURES=1"
    )


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


@pytest.mark.parametrize(
    ("name", "type_key"),
    [
        ("newsletter-welcome", "newsletter"),
        ("newsletter-monthly", "newsletter"),
        ("verification-code", "verification_code"),
        ("member-invitation", "member_invitation"),
        ("application-received", "application_received"),
        ("valuation-offer", "application_approved"),
        ("application-refused", "application_refused"),
        ("application-refused-after-booking", "application_refused"),
        ("job-application-received", "job_application_received"),
        ("partner-application-received", "partner_application_received"),
        ("partner-application-received-valuer", "partner_application_received"),
        ("contact-received", "contact_received"),
        ("contact-received-untitled", "contact_received"),
        ("staff-notification", "staff_notification"),
    ],
)
def test_the_ready_made_designs_pass_the_server_checks(name: str, type_key: str) -> None:
    """The designs templates are seeded with must be activatable."""
    from app.domains.email_builder.document import check_email
    from app.domains.email_builder.types import email_type

    case = json.loads((DESIGNS / f"{name}.json").read_text(encoding="utf-8"))
    spec = email_type(type_key)
    assert spec is not None
    assert check_email(case["document"], spec) == []
