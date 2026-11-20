"""``check_form`` against ``@builderset/form``'s own fixtures.

Every valid fixture must pass, and every invalid one be refused with exactly
the codes its manifest names — errors as errors, warnings as warnings — as the
TypeScript checker does: when the form builder and a Python backend disagree
about what a form may contain, one of these fails before anyone finds out.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest

from builderset.form import (
    DRAFT_TOLERATES,
    check_form,
    is_draft_blocking,
    is_publish_blocking,
    is_warning,
    media_keys,
)
from builderset.form.answers import ANSWER_FORMAT_SOURCES
from builderset.form.schema import SCHEMA_PATH
from conftest import FORM_FIXTURES

VALID = sorted((FORM_FIXTURES / "valid").glob("*.json"))
MANIFEST: dict[str, dict[str, list[str]]] = json.loads(
    (FORM_FIXTURES / "invalid" / "manifest.json").read_text(encoding="utf-8")
)
SCHEMA: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def _load(path: Path) -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(path.read_text(encoding="utf-8"))
    return loaded


def _sink() -> dict[str, Any]:
    return _load(FORM_FIXTURES / "valid" / "kitchen-sink.json")


def _codes(document: Any, **kwargs: Any) -> set[str]:
    return {issue.code for issue in check_form(document, **kwargs)}


def _node(document: dict[str, Any], node_type: str) -> dict[str, Any]:
    found: dict[str, Any] = next(
        node for node in document["nodes"].values() if node["type"] == node_type
    )
    return found


class TestContract:
    def test_the_fixtures_are_there(self) -> None:
        assert {path.stem for path in VALID} >= {"kitchen-sink", "empty", "contact"}
        assert len(VALID) >= 20
        assert len(MANIFEST) >= 20

    def test_a_draft_is_lenient_on_the_kits_codes_exactly(self) -> None:
        draft = _load(FORM_FIXTURES / "draft.json")
        assert sorted(draft["tolerates"]) == sorted(DRAFT_TOLERATES)

    @pytest.mark.parametrize("path", VALID, ids=lambda p: p.stem)
    def test_a_valid_fixture_is_accepted(self, path: Path) -> None:
        issues = check_form(_load(path))
        if path.stem == "empty":
            # A new form, no question yet: a draft, not yet something to publish.
            assert sorted(issue.code for issue in issues) == ["form.noFields", "step.empty"]
            assert not any(is_draft_blocking(issue) for issue in issues)
            assert any(is_publish_blocking(issue) for issue in issues)
        else:
            assert issues == []

    @pytest.mark.parametrize("name", sorted(MANIFEST), ids=lambda n: n.removesuffix(".json"))
    def test_an_invalid_fixture_is_refused_with_its_codes(self, name: str) -> None:
        issues = check_form(_load(FORM_FIXTURES / "invalid" / name))
        errors = sorted({issue.code for issue in issues if not is_warning(issue)})
        warnings = sorted({issue.code for issue in issues if is_warning(issue)})
        assert {"errors": errors, "warnings": warnings} == MANIFEST[name]

    def test_the_kitchen_sink_uses_every_standard_element(self) -> None:
        used = {node["type"] for node in _sink()["nodes"].values()}
        assert used == set(SCHEMA["x-elements"])

    def test_the_answer_formats_are_the_ones_ported(self) -> None:
        """A change to `ANSWER_FORMATS` in TS fails here until `answers.py` follows it."""
        published = {name: rule["source"] for name, rule in SCHEMA["x-answer-formats"].items()}
        assert published == ANSWER_FORMAT_SOURCES


class TestRefusals:
    def test_not_a_form_at_all(self) -> None:
        assert _codes("<form></form>") == {"document.notJson"}
        assert _codes({"nodes": []}) == {"document.malformed"}

    def test_a_cycle_is_refused_not_followed(self) -> None:
        document = _sink()
        step = _node(document, "step")
        step["children"].append(step["id"])
        assert "placement.notAllowed" in _codes(document)

    def test_a_key_with_a_trailing_newline_is_refused_as_javascript_does(self) -> None:
        document = _sink()
        _node(document, "text")["props"]["key"] = "plate\n"
        assert _codes(document) == {"props.invalid"}

    def test_upper_case_colours_and_prefill_names_are_accepted(self) -> None:
        document = _sink()
        document["settings"]["style"]["accent"] = "#2F5CF0"
        _node(document, "text")["props"]["prefill"] = "Plate"
        assert _codes(document) == set()

    def test_a_pattern_python_cannot_compile_is_reported(self) -> None:
        document = _sink()
        _node(document, "text")["props"]["checks"].update(pattern="custom", regex="[a-")
        assert _codes(document) == {"field.patternInvalid"}

    def test_a_draft_tolerates_only_work_in_progress(self) -> None:
        assert "url.unsafe" not in DRAFT_TOLERATES
        assert "document.orphan" not in DRAFT_TOLERATES
        assert "form.noFields" in DRAFT_TOLERATES

    @pytest.mark.parametrize("url", ["/thank-you", "https://example.com/thanks", "#done"])
    def test_a_redirect_to_a_web_address_or_a_path_here_is_fine(self, url: str) -> None:
        document = _sink()
        document["settings"]["after"].update(mode="redirect", redirectUrl=url)
        document["settings"]["webhook"] = "https://hooks.example.com/forms"
        assert _codes(document) == set()

    @pytest.mark.parametrize("url", ["javascript:alert(1)", "//evil.test/x", "data:text/html,x"])
    def test_an_unsafe_redirect_or_webhook_is_refused_even_in_a_draft(self, url: str) -> None:
        for where in ("redirect", "webhook"):
            document = _sink()
            if where == "redirect":
                document["settings"]["after"]["redirectUrl"] = url
            else:
                document["settings"]["webhook"] = url
            issues = check_form(document)
            assert [issue.code for issue in issues] == ["url.unsafe"]
            assert is_draft_blocking(issues[0])

    def test_warnings_never_block(self) -> None:
        issues = check_form(_load(FORM_FIXTURES / "invalid" / "every-warning.json"))
        warnings = [issue for issue in issues if is_warning(issue)]
        assert warnings
        assert not any(is_publish_blocking(issue) or is_draft_blocking(issue) for issue in warnings)


class TestMediaRule:
    """Which keys a form may hold is the project's rule, passed in."""

    def _with_key(self, key: str) -> dict[str, Any]:
        document = _sink()
        _node(document, "image")["props"]["media"]["key"] = key
        return document

    @pytest.mark.parametrize("key", ["../secrets/x.png", "/etc/passwd", "a\\b.png", "a b.png"])
    def test_without_a_rule_a_bad_shape_is_refused(self, key: str) -> None:
        issues = check_form(self._with_key(key))
        assert [(issue.code, issue.path) for issue in issues] == [("media.invalidKey", "media")]
        assert is_draft_blocking(issues[0])

    def test_the_projects_rule_decides_and_names_the_code(self) -> None:
        def rule(key: str) -> str | None:
            return None if key.startswith("form-image/") else "media.wrongFolder"

        assert _codes(self._with_key("brand-logo/a.png"), check_media_key=rule) == {
            "media.wrongFolder"
        }
        assert _codes(self._with_key("form-image/a.png"), check_media_key=rule) == set()

    def test_media_keys(self) -> None:
        assert media_keys(_sink()) == ["form-image/2026/01/car.jpg"]


def _with_languages(base: str, *others: str) -> dict[str, Any]:
    document = copy.deepcopy(_sink())
    document["i18n"] = {
        "enabled": True,
        "base": base,
        "translations": {locale: {"meta": {"title": "x"}} for locale in others},
    }
    return document


class TestLanguages:
    def test_any_language_code_is_a_valid_form(self) -> None:
        assert _codes(_with_languages("fr", "pt-BR")) == set()

    def test_the_project_decides_which_languages_it_writes_in(self) -> None:
        issues = check_form(_with_languages("sq", "en", "fr"), locales=("sq", "en", "de"))
        unknown = [issue for issue in issues if issue.code == "i18n.locale.unknown"]
        assert [issue.params for issue in unknown] == [{"locale": "fr"}]
        assert "i18n.locale.unknown" in DRAFT_TOLERATES

    def test_a_translated_label_is_held_to_the_fields_schema(self) -> None:
        document = _with_languages("en", "de")
        text = _node(document, "text")
        document["i18n"]["translations"]["de"]["nodes"] = {text["id"]: {"label": "x" * 301}}
        issues = check_form(document)
        assert [(issue.code, issue.node_id, issue.path) for issue in issues] == [
            ("props.invalid", text["id"], "de.label")
        ]
