"""The Python code shown on the docs site runs, against the kit's own fixtures."""

from __future__ import annotations

import json
import runpy

from conftest import EMAIL_FIXTURES, REPOSITORY

SNIPPETS = REPOSITORY / "apps" / "docs" / "snippets" / "python"


def test_send_email_checks_and_renders_the_starter() -> None:
    namespace = runpy.run_path(str(SNIPPETS / "send_email.py"))
    document = json.loads((EMAIL_FIXTURES / "valid" / "starter.json").read_text(encoding="utf-8"))
    subject, html, text = namespace["render"](document)
    assert subject and text
    assert html.startswith("<!DOCTYPE html")
