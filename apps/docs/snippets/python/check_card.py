"""Check a card design before it is printed, and issue one member's card.

Shown on the docs site (Reference → Python).
"""

from typing import Any

from builderset.card import check_card, fields_used, fill_card, is_print_blocking

# Your members' fields: the default ones, and two of your own.
FIELDS = [
    {"path": path, "kind": "text"}
    for path in (
        "member.name",
        "member.number",
        "member.tier",
        "member.since",
        "member.valid_until",
        "member.qr",
        "member.plan",
        "club.branch",
    )
] + [{"path": "member.photo", "kind": "photo"}]


def approve(card: dict[str, Any]) -> list[dict[str, Any]]:
    """Refuse a design with an error; return its warnings to show the designer."""
    issues = check_card(card, fields=FIELDS, locales=["sq", "en"])
    errors = [issue for issue in issues if is_print_blocking(issue)]
    if errors:
        raise ValueError([issue.as_dict() for issue in errors])
    return [issue.as_dict() for issue in issues]


def issue(card: dict[str, Any], member: dict[str, str]) -> dict[str, Any]:
    """One member's card: the approved design with their data frozen into it."""
    missing = [path for path in fields_used(card) if not member.get(path)]
    if missing:
        raise ValueError({"missing": missing})
    return fill_card(card, member)
