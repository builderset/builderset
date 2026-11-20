"""Whether a popup shows here and now — ``display.ts`` in Python.

The display rules as one pure function: ``PopupView`` asks it in the browser,
a server deciding which popups to send with a page asks :func:`should_show`,
and both get the same answer. ``packages/popup/fixtures/show.json`` holds the
TypeScript results and the tests hold this module to them.

The context is a mapping with the TypeScript names, as a browser would post
it: ``path``, ``device`` (``desktop`` or ``mobile``), ``language``,
``returning``, ``now`` (milliseconds since 1970), ``today`` (``2026-11-30``;
default: ``now``'s date in this process's time zone), ``seen`` (what the
browser remembers: ``shownAt``, ``session``, ``closedAt``, ``submittedAt``)
and ``session``.

The trigger is not part of it: the rules say WHETHER, the trigger WHEN.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Mapping, Sequence
from datetime import datetime
from typing import Any, TypeVar

from builderset.form import _js

#: The rules that hide a popup, in the order they are checked (``x-hide-reasons``).
HIDE_REASONS = ("device", "dates", "pages", "audience", "language", "frequency")

_DAY_MS = 86_400_000
_QUERY = re.compile(r"[?#]")


def normalise_path(path: str) -> str:
    """A path as rules compare it: no query or hash, no trailing slash but the root's."""
    clean = _QUERY.split(path, maxsplit=1)[0]
    if not clean.startswith("/"):
        clean = f"/{clean}"
    while len(clean) > 1 and clean.endswith("/"):
        clean = clean[:-1]
    return clean


def path_matches(rule: str, path: str) -> bool:
    """Whether a path matches a rule. ``*`` stands for any part, slashes included."""
    pattern = ".*".join(re.escape(part) for part in normalise_path(_js.trim(rule)).split("*"))
    return re.fullmatch(pattern, normalise_path(path), re.DOTALL) is not None


def language_matches(wanted: str, page: str | None) -> bool:
    """Whether the page's language is the one the popup is for: ``sq`` takes ``sq-AL`` too."""
    if wanted == "all":
        return True
    if not page:
        return False
    want, have = wanted.lower(), page.lower()
    return have == want or have.startswith(f"{want}-")


def local_day(now: float) -> str:
    """``now``'s date in this process's time zone, ``2026-11-30``."""
    return datetime.fromtimestamp(now / 1000).strftime("%Y-%m-%d")  # noqa: DTZ006 - local on purpose


def _frequency_hides(display: Mapping[str, Any], context: Mapping[str, Any]) -> bool:
    seen = context.get("seen")
    if not isinstance(seen, Mapping) or display.get("frequency") == "every":
        return False
    # Someone who filled it in has answered it; asking again is nagging.
    if seen.get("submittedAt") is not None:
        return True
    frequency = display.get("frequency")
    if frequency == "session":
        return seen.get("session") is not None and seen.get("session") == context.get("session")
    if frequency == "days":
        shown = seen.get("shownAt")
        return _js.is_number(shown) and context["now"] - shown < display["days"] * _DAY_MS
    if frequency == "until":
        return seen.get("closedAt") is not None
    return False


def display_hides(display: Mapping[str, Any], context: Mapping[str, Any]) -> str | None:
    """The display rules on their own: why they hide the popup, or ``None`` when it shows."""
    if not display.get("desktop" if context.get("device") == "desktop" else "mobile"):
        return "device"
    today = context.get("today") or local_day(context["now"])
    starts, ends = display.get("starts"), display.get("ends")
    if (starts and today < starts) or (ends and today > ends):
        return "dates"
    if display.get("pages") != "all":
        listed = any(
            isinstance(rule, str) and _js.trim(rule) and path_matches(rule, context["path"])
            for rule in display.get("rules") or []
        )
        if not listed if display.get("pages") == "only" else listed:
            return "pages"
    audience = display.get("audience")
    if audience != "all" and (audience == "returning") != bool(context.get("returning")):
        return "audience"
    if not language_matches(str(display.get("language")), context.get("language")):
        return "language"
    if _frequency_hides(display, context):
        return "frequency"
    return None


def _display(popup: Mapping[str, Any]) -> Mapping[str, Any]:
    root = popup["nodes"][popup["root"]]
    display: Mapping[str, Any] = root["props"]["display"]
    return display


def why_hidden(popup: Mapping[str, Any], context: Mapping[str, Any]) -> str | None:
    """Why this popup does not show here and now, or ``None`` when it does."""
    return display_hides(_display(popup), context)


def should_show(popup: Mapping[str, Any], context: Mapping[str, Any]) -> bool:
    """Whether this popup shows here and now. Its trigger then decides when."""
    return why_hidden(popup, context) is None


P = TypeVar("P", bound=Mapping[str, Any])


def pick_popup(
    popups: Sequence[P],
    context: Mapping[str, Any] | Callable[[P], Mapping[str, Any]],
) -> P | None:
    """Of several popups that could show on one page, the one that does.

    The highest ``display.priority`` among those the rules let through, the
    first listed on a tie; ``None`` when none shows.
    """
    best: P | None = None
    for popup in popups:
        facts = context(popup) if callable(context) else context
        if not should_show(popup, facts):
            continue
        if best is None or _display(popup)["priority"] > _display(best)["priority"]:
            best = popup
    return best


__all__ = [
    "HIDE_REASONS",
    "display_hides",
    "language_matches",
    "local_day",
    "normalise_path",
    "path_matches",
    "pick_popup",
    "should_show",
    "why_hidden",
]
