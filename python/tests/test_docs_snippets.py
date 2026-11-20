"""The Python code shown on the docs site runs, against the kit's own fixtures."""

from __future__ import annotations

import json
import runpy

import pytest

from conftest import EMAIL_FIXTURES, FORM_FIXTURES, REPOSITORY

SNIPPETS = REPOSITORY / "apps" / "docs" / "snippets" / "python"


def test_send_email_checks_and_renders_the_starter() -> None:
    namespace = runpy.run_path(str(SNIPPETS / "send_email.py"))
    document = json.loads((EMAIL_FIXTURES / "valid" / "starter.json").read_text(encoding="utf-8"))
    subject, html, text = namespace["render"](document)
    assert subject and text
    assert html.startswith("<!DOCTYPE html")


def test_check_form_publishes_a_template_and_receives_its_answers() -> None:
    namespace = runpy.run_path(str(SNIPPETS / "check_form.py"))
    form = json.loads((FORM_FIXTURES / "valid" / "contact.json").read_text(encoding="utf-8"))
    assert namespace["publish"](form) == []
    answers = {
        "name": {"first": "Ana", "last": "Kurti"},
        "email": "ana@example.com",
        "topic": "Sales",
        "message": "How much is the blue one?",
        "consent": True,
    }
    assert namespace["receive"](form, answers) == answers
    with pytest.raises(ValueError, match="required"):
        namespace["receive"](form, {**answers, "email": " "})


CARD_FIXTURES = REPOSITORY / "packages" / "card" / "fixtures"
POPUP_FIXTURES = REPOSITORY / "packages" / "popup" / "fixtures"


def test_check_card_approves_a_template_and_issues_a_members_card() -> None:
    namespace = runpy.run_path(str(SNIPPETS / "check_card.py"))
    card = json.loads(
        (CARD_FIXTURES / "valid" / "gold-membership.json").read_text(encoding="utf-8")
    )
    namespace["approve"](card)  # warnings at most: a print-blocking error raises
    from builderset.card import fields_used

    member = dict.fromkeys(fields_used(card), "Arben Hoxha")
    issued = namespace["issue"](card, member)
    assert "Arben Hoxha" in json.dumps(issued, ensure_ascii=False)
    with pytest.raises(ValueError, match="missing"):
        namespace["issue"](card, {})


def test_popup_server_publishes_picks_and_receives() -> None:
    namespace = runpy.run_path(str(SNIPPETS / "popup_server.py"))
    popup = json.loads(
        (POPUP_FIXTURES / "valid" / "newsletter-modal.json").read_text(encoding="utf-8")
    )
    namespace["publish"](popup)
    assert isinstance(namespace["popups_for"]([popup], "/", "sq"), list)
    with pytest.raises(ValueError):
        namespace["receive"](popup, {})
