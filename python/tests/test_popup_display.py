"""``should_show`` against ``whyHidden``'s own results.

``packages/popup/fixtures/show.json`` is written by the TypeScript tests: each
case display rules, a visitor's context and the reason ``whyHidden`` gave. A
server deciding which popups go with a page must decide as the browser does.
"""

from __future__ import annotations

import json
from typing import Any

import pytest

from builderset.popup import (
    HIDE_REASONS,
    display_hides,
    local_day,
    normalise_path,
    path_matches,
    pick_popup,
    should_show,
    why_hidden,
)
from conftest import REPOSITORY

POPUP_FIXTURES = REPOSITORY / "packages" / "popup" / "fixtures"
CASES: list[dict[str, Any]] = json.loads(
    (POPUP_FIXTURES / "show.json").read_text(encoding="utf-8")
)["cases"]
SCHEMA: dict[str, Any] = json.loads(
    (REPOSITORY / "packages" / "popup" / "schema" / "popup.schema.json").read_text(encoding="utf-8")
)


def _popup(**display: Any) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(
        (POPUP_FIXTURES / "valid" / "kitchen-sink.json").read_text(encoding="utf-8")
    )
    loaded["nodes"]["root"]["props"]["display"].update(display)
    return loaded


def test_there_are_enough_cases() -> None:
    assert len(CASES) >= 30
    assert {case["expected"] for case in CASES} == {None, *HIDE_REASONS}


def test_the_reasons_are_the_published_ones() -> None:
    assert tuple(SCHEMA["x-hide-reasons"]) == HIDE_REASONS


@pytest.mark.parametrize("case", CASES, ids=lambda case: str(case["name"]))
def test_each_case_gives_what_typescript_gives(case: dict[str, Any]) -> None:
    assert display_hides(case["display"], case["context"]) == case["expected"]


def test_a_whole_document() -> None:
    context = {"path": "/account/settings", "device": "desktop", "now": 0, "today": "2026-11-20"}
    assert why_hidden(_popup(), context) == "pages"
    assert should_show(_popup(), {**context, "path": "/makina"})


def test_paths() -> None:
    assert normalise_path("blog//?page=2#top") == "/blog"
    assert path_matches(" /vleresim/ ", "/vleresim?x=1")
    assert path_matches("/*", "/")
    assert not path_matches("/blog/*", "/blog")
    assert not path_matches("/a.b", "/axb")


def test_today_is_the_local_date_unless_given() -> None:
    now = 1_795_000_000_000
    popup = _popup(ends=local_day(now))
    assert should_show(popup, {"path": "/", "device": "mobile", "now": now})
    assert not should_show(
        popup, {"path": "/", "device": "mobile", "now": now, "today": "2099-01-01"}
    )


def test_the_highest_priority_wins() -> None:
    low, high, tie = _popup(priority=1), _popup(priority=5), _popup(priority=5)
    elsewhere = _popup(priority=9, pages="only", rules=["/blog/*"])
    context = {"path": "/makina", "device": "desktop", "now": 0, "today": "2026-11-20"}
    assert pick_popup([low, elsewhere, high, tie], context) is high
    assert pick_popup([elsewhere], context) is None
    assert pick_popup([low], lambda _popup: {**context, "device": "mobile"}) is low
