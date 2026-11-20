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
