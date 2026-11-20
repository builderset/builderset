"""Check an email template and render it, on a Python server.

Shown on the docs site (Reference → Python) and run by
python/tests/test_docs_snippets.py, so it cannot go stale.
"""

from builderset.email import check_email, render_email


def media_rule(key: str) -> str | None:
    """Your rule for media keys: None when allowed, otherwise the issue code."""
    return None if key.startswith("email-image/") else "media.wrongFolder"


def render(document: dict) -> tuple[str, str, str]:
    issues = check_email(document, locales=["en", "de"], check_media_key=media_rule)
    if issues:
        raise ValueError([issue.as_dict() for issue in issues])

    email = render_email(
        document,
        asset_url=lambda key: f"https://cdn.example.com/{key}",
        data={"recipient": {"name": "Ana"}},
        locale="en",
    )
    return email.subject, email.html, email.text
