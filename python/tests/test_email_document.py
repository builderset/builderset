"""The email template check — the server half of the @builderset/email contract.

``@builderset/email`` ships its JSON Schema and fixtures, copied into this tree
from the installed version by ``scripts/sync-builder-contract.mjs``; every
valid fixture must pass and every invalid one be refused with the code its
manifest names, exactly as the core's own checker does.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from app.domains.email_builder.document import (
    DRAFT_TOLERATES,
    check_email,
    is_safe_template_url,
    media_keys,
    variable_uses,
)
from app.domains.email_builder.types import EMAIL_TYPES, email_type, variable_paths

FIXTURES = Path(__file__).parent.parent / "fixtures" / "email"
VALID = sorted((FIXTURES / "valid").glob("*.json"))


def test_a_draft_is_lenient_on_the_kits_codes_exactly() -> None:
    draft = json.loads((FIXTURES / "draft.json").read_text(encoding="utf-8"))
    assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)


MANIFEST: dict[str, str] = json.loads((FIXTURES / "invalid" / "manifest.json").read_text())


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _codes(document: Any, **kwargs: Any) -> set[str]:
    return {issue.code for issue in check_email(document, **kwargs)}


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "starter", "empty"}
        assert len(MANIFEST) >= 4

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        assert check_email(_load(path)) == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_code(self, name: str) -> None:
        assert MANIFEST[name] in _codes(_load(FIXTURES / "invalid" / name))


class TestTypes:
    def test_every_type_is_well_formed(self) -> None:
        keys = [spec["key"] for spec in EMAIL_TYPES]
        assert len(keys) == len(set(keys))
        for spec in EMAIL_TYPES:
            paths = variable_paths(spec)
            for path in spec.get("mustUse") or []:
                assert path in paths, (spec["key"], path)
            for sample in spec["samples"].values():
                assert isinstance(sample, dict)

    def test_the_existing_templates_all_have_a_type(self) -> None:
        from app.integrations.email.templates import ALL_TEMPLATES

        for template in ALL_TEMPLATES:
            assert email_type(template.value) is not None, template

    def test_unknown_variables_and_must_use(self) -> None:
        spec = email_type("password_reset")
        assert spec is not None
        document = _load(FIXTURES / "valid" / "starter.json")
        codes = _codes(document, spec=spec)
        # The starter uses recipient.name (a system variable) but not reset_url.
        assert "variable.mustUse" in codes
        assert "variable.unknown" not in codes

    def test_marketing_needs_an_unsubscribe(self) -> None:
        spec = email_type("newsletter")
        assert spec is not None
        document = _load(FIXTURES / "valid" / "starter.json")
        assert "compliance.unsubscribeMissing" not in _codes(document, spec=spec)
        for node in document["nodes"].values():
            if node["type"] == "footer":
                node["props"]["showUnsubscribe"] = False
        assert "compliance.unsubscribeMissing" in _codes(document, spec=spec)


class TestHelpers:
    @pytest.mark.parametrize(
        ("url", "safe"),
        [
            ("https://marrimauto.com", True),
            ("{{ reset_url }}", True),
            ("https://marrimauto.com/o?ref={{ code }}", True),
            ("javascript:alert(1)", False),
            ("javascript:{{ code }}", False),
        ],
    )
    def test_template_urls(self, url: str, safe: bool) -> None:
        assert is_safe_template_url(url) is safe

    def test_variable_uses_count_runs_once(self) -> None:
        document = _load(FIXTURES / "valid" / "kitchen-sink.json")
        uses = variable_uses(document)
        assert uses.count("recipient.name") == 2  # subject + heading
        assert "email-image/2026/01/sample0000000000.jpg" in media_keys(document)


def test_any_language_code_is_valid_and_the_project_decides() -> None:
    document = _load(FIXTURES / "valid" / "empty.json")
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
