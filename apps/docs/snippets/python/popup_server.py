"""A popup's server side: check it before it goes live, choose the popups for
a page, and check what a visitor sends.

Shown on the docs site (Reference → Python).
"""

import time
from typing import Any

from builderset.popup import check_popup, is_publish_blocking, should_show, validate_submission

# The variables your pages fill in: the editor's `fields`.
VARIABLES = ["visitor.first_name", "offer.ends", "page.title"]


def publish(popup: dict[str, Any]) -> list[dict[str, Any]]:
    """Refuse a popup with an error; return its warnings to show the person building it."""
    issues = check_popup(popup, locales=["sq", "en"], variables=VARIABLES)
    errors = [issue for issue in issues if is_publish_blocking(issue)]
    if errors:
        raise ValueError([issue.as_dict() for issue in errors])
    return [issue.as_dict() for issue in issues]


def popups_for(live: list[dict[str, Any]], path: str, locale: str) -> list[dict[str, Any]]:
    """The live popups that may show on this page, the highest priority first.

    The device and a returning visitor are the browser's to know: a popup stays
    in if it would show to any visitor, and PopupView decides the rest.
    """
    facts = {"path": path, "language": locale, "now": time.time() * 1000}
    visitors = [
        {"device": device, "returning": returning}
        for device in ("desktop", "mobile")
        for returning in (False, True)
    ]
    shown = [p for p in live if any(should_show(p, {**facts, **v}) for v in visitors)]
    return sorted(shown, key=lambda p: -p["nodes"][p["root"]]["props"]["display"]["priority"])


def receive(popup: dict[str, Any], values: Any) -> dict[str, str]:
    """The answers worth storing — or, per input, the first thing wrong."""
    result = validate_submission(popup, values)
    if not result.ok:
        raise ValueError(result.as_dict()["errors"])
    return result.values
