"""``check_email`` against ``@builderset/email``'s own fixtures.

Every valid fixture must pass and every invalid one be refused with the code
its manifest names, exactly as the TypeScript checker does.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from builderset.email import (
    DRAFT_TOLERATES,
    EmailTypeSpec,
    check_email,
    is_safe_template_url,
    media_keys,
    variable_paths,
    variable_uses,
)
from conftest import EMAIL_FIXTURES

VALID = sorted((EMAIL_FIXTURES / "valid").glob("*.json"))
MANIFEST: dict[str, str] = json.loads(
    (EMAIL_FIXTURES / "invalid" / "manifest.json").read_text(encoding="utf-8")
)

#: A transactional type of the kind an application declares.
RESET: EmailTypeSpec = {
    "key": "password_reset",
    "kind": "transactional",
    "variables": [{"name": "reset_url", "type": "url", "required": True}],
    "mustUse": ["reset_url"],
    "samples": {},
}
#: A marketing type: it must carry an unsubscribe link.
NEWSLETTER: EmailTypeSpec = {"key": "newsletter", "kind": "marketing", "variables": []}


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _codes(document: Any, **kwargs: Any) -> set[str]:
    return {issue.code for issue in check_email(document, **kwargs)}


def test_a_draft_is_lenient_on_the_kits_codes_exactly() -> None:
    draft = _load(EMAIL_FIXTURES / "draft.json")
    assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "starter", "empty"}
        assert len(MANIFEST) >= 4

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        assert check_email(_load(path)) == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_code(self, name: str) -> None:
        assert MANIFEST[name] in _codes(_load(EMAIL_FIXTURES / "invalid" / name))


class TestTypes:
    def test_the_system_variables_are_always_known(self) -> None:
        paths = variable_paths(RESET)
        assert {"reset_url", "recipient.name", "links.unsubscribe", "now"} <= paths

    def test_unknown_variables_and_must_use(self) -> None:
        document = _load(EMAIL_FIXTURES / "valid" / "starter.json")
        codes = _codes(document, spec=RESET)
        # The starter uses recipient.name (a system variable) but not reset_url.
        assert "variable.mustUse" in codes
        assert "variable.unknown" not in codes

    def test_marketing_needs_an_unsubscribe(self) -> None:
        document = _load(EMAIL_FIXTURES / "valid" / "starter.json")
        assert "compliance.unsubscribeMissing" not in _codes(document, spec=NEWSLETTER)
        for node in document["nodes"].values():
            if node["type"] == "footer":
                node["props"]["showUnsubscribe"] = False
        assert "compliance.unsubscribeMissing" in _codes(document, spec=NEWSLETTER)


class TestMediaRule:
    def test_the_projects_rule_decides(self) -> None:
        document = _load(EMAIL_FIXTURES / "valid" / "kitchen-sink.json")
        assert media_keys(document)

        def rule(key: str) -> str | None:
            return "media.wrongFolder"

        assert "media.wrongFolder" in _codes(document, check_media_key=rule)
        assert _codes(document) == set()


class TestHelpers:
    @pytest.mark.parametrize(
        ("url", "safe"),
        [
            ("https://example.com", True),
            ("{{ reset_url }}", True),
            ("https://example.com/o?ref={{ code }}", True),
            ("javascript:alert(1)", False),
            ("javascript:{{ code }}", False),
        ],
    )
    def test_template_urls(self, url: str, safe: bool) -> None:
        assert is_safe_template_url(url) is safe

    def test_variable_uses_count_runs_once(self) -> None:
        document = _load(EMAIL_FIXTURES / "valid" / "kitchen-sink.json")
        uses = variable_uses(document)
        assert uses.count("recipient.name") == 2  # subject + heading
        assert "email-image/2026/01/sample0000000000.jpg" in media_keys(document)


def test_any_language_code_is_valid_and_the_project_decides() -> None:
    document = _load(EMAIL_FIXTURES / "valid" / "empty.json")
    document["i18n"] = {
        "enabled": True,
        "base": "fr",
        "translations": {"it": {"meta": {"subject": "Ciao"}}},
    }
    assert "i18n.locale.unknown" not in _codes(document)
    issues = check_email(document, locales=("sq", "en", "de"))
    assert sorted(
        issue.params["locale"] for issue in issues if issue.code == "i18n.locale.unknown"
    ) == ["fr", "it"]
    assert "i18n.locale.unknown" in DRAFT_TOLERATES
