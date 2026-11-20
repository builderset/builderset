"""Check a form before it goes live, and a visitor's answers when they arrive.

Shown on the docs site (Reference → Python) and run by
python/tests/test_docs_snippets.py, so it cannot go stale.
"""

from typing import Any

from builderset.form import check_form, is_publish_blocking, validate_answers


def publish(form: dict[str, Any]) -> list[dict[str, Any]]:
    """Refuse a form with an error; return its warnings to show the person building it."""
    issues = check_form(form, locales=["en", "de"])
    errors = [issue for issue in issues if is_publish_blocking(issue)]
    if errors:
        raise ValueError([issue.as_dict() for issue in errors])
    return [issue.as_dict() for issue in issues]


def receive(form: dict[str, Any], answers: dict[str, Any]) -> dict[str, Any]:
    """The answers worth storing — or the reasons, per field, as the browser showed them."""
    result = validate_answers(form, answers)
    if not result.ok:
        raise ValueError(result.as_dict()["errors"])
    return result.values
