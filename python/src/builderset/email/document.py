"""Email templates: validation against the @builderset/email contract.

Like article documents (see ``app/domains/content/document.py``), an email
template is checked against the JSON Schema that ``@builderset/email``
generates — copied beside this file as ``email_schema.json`` by
``scripts/sync-builder-contract.mjs``, never edited here — plus what a schema cannot say: the tree's shape and placement rules,
row layouts matching their columns, URL safety, media folders, and the
variables the template's EMAIL TYPE actually provides.

Error codes are @builderset/email's own, so the builder shows the server's refusal in
the words its own checker uses.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator, Sequence
from dataclasses import replace
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from app.core.content_i18n import document_locales, localize, unknown_locales
from app.domains.content.document import DocumentIssue, is_safe_url
from app.domains.email_builder.types import EmailTypeSpec, variable_paths
from app.integrations import storage

SCHEMA_PATH = Path(__file__).with_name("email_schema.json")

#: Where an email's pictures may live: a public folder, because a mail client
#: fetches them anonymously, and never another feature's files.
EMAIL_FOLDERS = frozenset({"email-image"})

#: Codes an in-progress DRAFT may still carry; activation refuses them.
#: ``EMAIL_DRAFT_TOLERATES`` in Builderset's ``packages/email/src/core/draft.ts``, held to it
#: by the contract test through ``tests/fixtures/email/draft.json``.
DRAFT_TOLERATES = frozenset(
    {
        "meta.subjectMissing",
        "variable.unknown",
        "variable.mustUse",
        "compliance.unsubscribeMissing",
        "i18n.locale.unknown",
    }
)

_TOKEN = re.compile(r"\{\{\s*([a-z_][a-z0-9_.]*)\s*(?:\|\s*([a-z_]+)\s*)?\}\}")


@cache
def _schema() -> dict[str, Any]:
    loaded: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return loaded


@cache
def _validator() -> Draft202012Validator:
    return Draft202012Validator(_schema())


def _elements() -> dict[str, dict[str, Any]]:
    elements: dict[str, dict[str, Any]] = _schema()["x-elements"]
    return elements


def _row_layouts() -> dict[str, list[float]]:
    layouts: dict[str, list[float]] = _schema()["x-row-layouts"]
    return layouts


def limits() -> dict[str, int]:
    values: dict[str, int] = _schema()["x-limits"]
    return values


def _can_contain(parent_type: str, child_type: str) -> bool:
    """`ElementRegistry.canContain`, from the exported placement rules."""
    elements = _elements()
    parent = elements.get(parent_type)
    child = elements.get(child_type)
    if not parent or not child or "container" not in parent:
        return False
    rule = parent["container"]
    if child.get("parents") is not None:
        return parent_type in child["parents"] and (
            "only" not in rule or child_type in rule["only"]
        )
    if "only" in rule:
        return child_type in rule["only"]
    return child_type not in rule.get("except", [])


def is_safe_template_url(value: str) -> bool:
    """`isSafeTemplateUrl` in ``email/src/core/fields.ts``."""
    if not _TOKEN.search(value):
        return is_safe_url(value)
    trimmed = value.strip()
    if trimmed.startswith("{{"):
        return True
    prefix = _TOKEN.split(trimmed)[0]
    return is_safe_url(prefix or trimmed)


def _schema_issues(document: Any) -> list[DocumentIssue]:
    issues: list[DocumentIssue] = []
    for error in _validator().iter_errors(document):
        path = list(error.absolute_path)
        node_id = str(path[1]) if len(path) > 1 and path[0] == "nodes" else None
        issues.append(
            DocumentIssue(
                "props.invalid" if node_id else "document.malformed",
                node_id=node_id,
                path=".".join(str(part) for part in path[3:])
                if node_id
                else ".".join(map(str, path)),
            )
        )
    return issues


def _structural_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    issues: list[DocumentIssue] = []
    nodes: dict[str, dict[str, Any]] = document.get("nodes") or {}
    root = nodes.get("root")
    if not root or root.get("type") != "root":
        return [DocumentIssue("document.noRoot")]
    bounds = limits()
    if len(nodes) > bounds["nodes"]:
        issues.append(DocumentIssue("document.tooManyNodes", params={"max": bounds["nodes"]}))

    elements = _elements()
    layouts = _row_layouts()
    seen: set[str] = set()

    def visit(node: dict[str, Any]) -> None:
        node_id = str(node.get("id"))
        if node_id in seen:
            issues.append(DocumentIssue("document.duplicateReference", node_id=node_id))
            return
        seen.add(node_id)
        node_type = str(node.get("type"))
        element = elements.get(node_type)
        if element is None:
            issues.append(
                DocumentIssue("element.unknown", node_id=node_id, params={"type": node_type})
            )
            return
        rule = element.get("container")
        children = node.get("children")
        if (rule is not None) != isinstance(children, list):
            issues.append(DocumentIssue("element.childrenMismatch", node_id=node_id))
        children = children if isinstance(children, list) else []
        if rule and "min" in rule and len(children) < rule["min"]:
            issues.append(DocumentIssue("container.minimum", node_id=node_id))
        if rule and "max" in rule and len(children) > rule["max"]:
            issues.append(DocumentIssue("container.full", node_id=node_id))
        if node_type == "row":
            layout = layouts.get(str((node.get("props") or {}).get("layout")))
            if layout is not None and len(layout) != len(children):
                issues.append(DocumentIssue("row.columnsMismatch", node_id=node_id, path="layout"))
        for child_id in children:
            child = nodes.get(child_id)
            if child is None:
                issues.append(DocumentIssue("document.missingChild", node_id=node_id))
                continue
            if not _can_contain(node_type, str(child.get("type"))):
                issues.append(DocumentIssue("placement.notAllowed", node_id=str(child_id)))
            visit(child)

    visit(root)
    for node_id in nodes:
        if node_id not in seen:
            issues.append(DocumentIssue("document.orphan", node_id=node_id))
    size = len(json.dumps(document, separators=(",", ":")).encode())
    if size > bounds["bytes"]:
        issues.append(DocumentIssue("document.tooLarge", params={"max": bounds["bytes"]}))
    return issues


def _walk(value: Any, path: str = "") -> Iterator[tuple[str, str, Any]]:
    if isinstance(value, dict):
        for key, item in value.items():
            child = f"{path}.{key}" if path else key
            yield child, key, item
            yield from _walk(item, child)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _walk(item, f"{path}.{index}")


#: The fields of a media reference (`mediaRefSchema` in @builderset/engine).
_MEDIA_FIELDS = frozenset({"key", "width", "height", "mime", "size", "name"})


def _media_refs(value: Any) -> Iterator[tuple[str, str]]:
    """Every `{key, …}` media reference inside a value."""
    for path, _key, item in _walk(value):
        if (
            isinstance(item, dict)
            and isinstance(item.get("key"), str)
            and set(item) <= _MEDIA_FIELDS
        ):
            yield path, str(item["key"])


def media_keys(document: dict[str, Any]) -> list[str]:
    keys: list[str] = []
    for node in (document.get("nodes") or {}).values():
        for _path, key in _media_refs(node.get("props") or {}):
            if key not in keys:
                keys.append(key)
    return keys


def _security_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    issues: list[DocumentIssue] = []
    for node_id, node in (document.get("nodes") or {}).items():
        props = node.get("props") or {}
        for path, key, value in _walk(props):
            if (
                key == "href"
                and isinstance(value, str)
                and value
                and not is_safe_template_url(value)
            ):
                issues.append(DocumentIssue("url.unsafe", node_id=node_id, path=path))
        for path, key in _media_refs(props):
            try:
                storage.validate_key(key)
            except storage.InvalidKey:
                issues.append(DocumentIssue("media.invalidKey", node_id=node_id, path=path))
                continue
            if key.split("/", 1)[0] not in EMAIL_FOLDERS:
                issues.append(DocumentIssue("media.wrongFolder", node_id=node_id, path=path))
    return issues


def variable_uses(document: dict[str, Any]) -> list[str]:
    """Every variable path the template references, as `variableUses` does."""
    uses: list[str] = []
    meta = document.get("meta") or {}
    for text in (meta.get("subject"), meta.get("preheader")):
        if isinstance(text, str):
            uses += [match.group(1) for match in _TOKEN.finditer(text)]

    def scan(value: Any) -> None:
        if isinstance(value, str):
            uses.extend(match.group(1) for match in _TOKEN.finditer(value))
        elif isinstance(value, list):
            for item in value:
                scan(item)
        elif isinstance(value, dict):
            marks = value.get("marks")
            variable = (
                next(
                    (m for m in marks if isinstance(m, dict) and m.get("type") == "variable"), None
                )
                if isinstance(marks, list)
                else None
            )
            if variable is not None:
                # A variable run: its text is only a label.
                uses.append(str(variable.get("path")))
                return
            for item in value.values():
                scan(item)

    for node in (document.get("nodes") or {}).values():
        scan(node.get("props") or {})
    return uses


def type_issues(document: dict[str, Any], spec: EmailTypeSpec) -> list[DocumentIssue]:
    """What depends on the email's TYPE: its variables and, for marketing, consent."""
    issues: list[DocumentIssue] = []
    known = variable_paths(spec)
    nodes = (document.get("nodes") or {}).values()
    loops = any(node.get("type") in {"repeat", "line-items"} for node in nodes)
    used = variable_uses(document)
    for path in sorted(set(used)):
        if path not in known and not (loops and path.startswith("item.")):
            issues.append(DocumentIssue("variable.unknown", params={"variable": path}))
    for path in spec.get("mustUse") or []:
        if path not in used:
            issues.append(DocumentIssue("variable.mustUse", params={"variable": path}))
    if spec.get("kind") == "marketing":
        has_footer = any(
            node.get("type") == "footer" and (node.get("props") or {}).get("showUnsubscribe")
            for node in nodes
        )
        if not has_footer and "links.unsubscribe" not in used:
            issues.append(DocumentIssue("compliance.unsubscribeMissing"))
    return issues


def check_email(
    document: Any,
    spec: EmailTypeSpec | None = None,
    *,
    locales: Sequence[str] | None = None,
) -> list[DocumentIssue]:
    """Every reason this template cannot be stored (or, strictly, activated).

    ``locales``: the languages the project writes in; a template holding another
    is ``i18n.locale.unknown``. Omitted, any language code is accepted.
    """
    if not isinstance(document, dict):
        return [DocumentIssue("document.notJson")]
    schema_issues = _schema_issues(document)
    if any(issue.code == "document.malformed" for issue in schema_issues):
        return schema_issues
    issues = [*schema_issues, *_structural_issues(document), *_security_issues(document)]
    meta = document.get("meta") or {}
    if not str(meta.get("subject") or "").strip():
        issues.append(DocumentIssue("meta.subjectMissing", path="meta.subject"))
    if spec is not None:
        issues += type_issues(document, spec)
    return issues + _language_issues(document, spec) + _unknown_locale_issues(document, locales)


def _unknown_locale_issues(
    document: dict[str, Any], locales: Sequence[str] | None
) -> list[DocumentIssue]:
    """A language the project does not write in — refused on publish, tolerated in a draft."""
    if locales is None:
        return []
    return [
        DocumentIssue("i18n.locale.unknown", path="i18n", params={"locale": locale})
        for locale in unknown_locales(document, locales)
    ]


def _key(issue: DocumentIssue) -> tuple[str, str | None, str | None, str]:
    return (issue.code, issue.node_id, issue.path, json.dumps(issue.params, sort_keys=True))


def _language_issues(document: dict[str, Any], spec: EmailTypeSpec | None) -> list[DocumentIssue]:
    """Each language, read as an email of its own, must still be a valid one.

    ``checkEmail``'s ``languageIssues`` in TS: a translated value the schema
    refuses, an unsafe link in translated text, a language without a subject,
    a variable the type does not have or a required one dropped. Reported only
    where a language differs from the base.
    """
    issues: list[DocumentIssue] = []
    base = {
        _key(issue)
        for issue in [
            *_schema_issues(document),
            *_security_issues(document),
            *(type_issues(document, spec) if spec is not None else []),
        ]
    }
    for locale in document_locales(document)[1:]:
        view = localize(document, locale)
        if view is document:
            continue
        found = [*_schema_issues(view), *_security_issues(view)]
        if not str((view.get("meta") or {}).get("subject") or "").strip():
            found.append(DocumentIssue("meta.subjectMissing", path="meta.subject"))
        if spec is not None:
            found += type_issues(view, spec)
        for issue in found:
            if _key(issue) in base:
                continue
            issues.append(replace(issue, params={**issue.params, "locale": locale}))
    return issues


__all__ = [
    "DRAFT_TOLERATES",
    "EMAIL_FOLDERS",
    "check_email",
    "is_safe_template_url",
    "media_keys",
    "type_issues",
    "variable_uses",
]
