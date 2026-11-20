"""Form documents: ``check_form`` — ``checkForm`` in ``packages/form/src/core/validate.ts``.

The editor, the renderer and this module agree on one definition of a form:
the JSON Schema ``@builderset/form`` generates from its own field schemas
(``packages/form/schema/form.schema.json``, shipped inside this package as
``schema.json``). The tests run the TypeScript package's fixtures through
``check_form`` and fail if the two sides ever disagree.

── What is checked, in the order TypeScript checks it ─────────────────────
1. Is it a form at all? The schema (every node's props against its field
   type, the meta, the settings), anchors, then what a JSON Schema cannot
   say, read from its ``x-`` sections: one root, every child present and
   referenced once, placement (fields in steps, steps in the root), the
   tree's limits — and each translation, read as a form of its own. As in
   TypeScript (zod), the tree's rules are skipped when a value is of the wrong
   kind, and still run when it only fails a check (too long, out of range);
   if any of this fails, those reasons are all that is reported.
2. Each field type's own checks: a label, two options, a pattern that
   compiles, a range that is one, consent words and a safe link, a picture's
   alt text, a step with something in it.
3. The form's rules across fields and settings: one column per key, logic
   that reads only earlier answers, an auto-reply with an email field to
   send to, a redirect with an address, consent where personal data is asked.
4. The project's rules, which TypeScript leaves to the host: every media key
   passing ``check_media_key``, every language in ``locales``.

Error codes are the TypeScript package's own. Some are warnings
(:data:`WARNINGS`): worth telling the person building the form, never a
reason to refuse it.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator, Sequence
from typing import Any

from builderset.form import _js
from builderset.form.answers import custom_pattern, form_fields, takes_answer
from builderset.form.schema import (
    answer_kinds,
    elements,
    limits,
    node_errors,
    personal_types,
    props_errors,
    validator,
)
from builderset.i18n import localize, unknown_locales
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule, is_safe_url, media_key_shape

#: What a saved DRAFT may still carry — ``FORM_DRAFT_TOLERATES`` in
#: ``packages/form/src/core/validate.ts``, held to it by the tests through
#: ``packages/form/fixtures/draft.json``: an empty form, a missing label or
#: option, a setting half done. What a draft may never carry is a malformed
#: tree, an unsafe link or a media key the project's rule refuses. Going live
#: checks strictly: every error blocks it, warnings never do.
DRAFT_TOLERATES = frozenset(
    {
        "form.noFields",
        "field.labelMissing",
        "field.optionsMissing",
        "field.keyDuplicate",
        "autoReply.noEmailField",
        "after.redirectMissing",
        "consent.textMissing",
        "i18n.locale.unknown",
    }
)

#: The codes ``checkForm`` reports as warnings: never a reason to refuse a form.
WARNINGS = frozenset(
    {
        "step.empty",
        "image.altMissing",
        "logic.unknownField",
        "notify.noRecipients",
        "consent.missing",
        "spam.none",
        "meta.titleMissing",
    }
)

_ANCHOR = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}")
_OPTION_TYPES = frozenset({"select", "radio", "checkbox"})


def is_warning(issue: DocumentIssue) -> bool:
    """Whether ``checkForm`` reports this issue as a warning rather than an error."""
    return issue.code in WARNINGS


def is_draft_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a form's draft from being saved."""
    return not is_warning(issue) and issue.code not in DRAFT_TOLERATES


def is_publish_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a form from going live: every error does."""
    return not is_warning(issue)


# ── 1. is it a form ────────────────────────────────────────────


def _nodes(document: dict[str, Any]) -> dict[str, Any]:
    nodes = document.get("nodes")
    return nodes if isinstance(nodes, dict) else {}


#: Schema keywords whose failure zod reports as a failed CHECK (a length, a
#: bound, a pattern) rather than a value of the wrong kind. zod goes on after a
#: failed check — the tree's own rules still run — and stops after the rest.
_CHECK_KEYWORDS = frozenset(
    {
        "minLength",
        "maxLength",
        "pattern",
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "minItems",
        "maxItems",
        "multipleOf",
    }
)


def _is_check(error: Any) -> bool:
    """Whether zod would report this failure as a check it continues past."""
    if "propertyNames" in error.schema_path:
        return False  # a record's key: zod's `invalid_key`, which stops it
    if error.validator in _CHECK_KEYWORDS:
        return True
    if error.validator == "type" and error.validator_value == "integer":
        # `z.number().int()`: a number is a number; whole is a check.
        return _js.is_number(error.instance)
    if error.validator == "anyOf":
        # `.nullable()`: zod checks the value itself, so the non-null branch decides.
        branches = error.validator_value
        others = [index for index, branch in enumerate(branches) if branch != {"type": "null"}]
        if len(others) == 1 and len(branches) == 2:
            inner = [sub for sub in error.context if sub.schema_path[0] == others[0]]
            return bool(inner) and all(_is_check(sub) for sub in inner)
    return False


def _ignored(error: Any) -> bool:
    """zod drops keys an object does not know rather than refusing them."""
    return error.validator == "additionalProperties" and error.validator_value is False


def _schema_issues(document: dict[str, Any]) -> tuple[list[DocumentIssue], bool]:
    """The JSON Schema's verdict, named as ``checkForm`` names zod's.

    Also whether zod would stop there: it goes on to the tree's own rules only
    when every failure is a check (see :data:`_CHECK_KEYWORDS`).
    """
    nodes = _nodes(document)
    known = elements()
    issues: list[DocumentIssue] = []
    stops = False

    def on_node(node_id: str, errors: list[Any], prefix: list[str]) -> None:
        nonlocal stops
        for error in errors:
            if _ignored(error):
                continue
            stops = stops or not _is_check(error)
            path = prefix + [str(part) for part in error.absolute_path]
            # zod's issue path is nodes.<id>.<field>.<rest>: `checkForm` keeps <rest>.
            issues.append(
                DocumentIssue("props.invalid", node_id=node_id, path=".".join(path[3:]) or None)
            )

    for error in validator().iter_errors(document):
        if _ignored(error):
            continue
        path = [str(part) for part in error.absolute_path]
        if len(path) > 1 and path[0] == "nodes" and path[1]:
            node_id = path[1]
            node = nodes.get(node_id)
            if not isinstance(node, dict) or node.get("type") not in known:
                issues.append(DocumentIssue("element.unknown", node_id=node_id))
                stops = True
            elif len(path) == 2 and error.validator == "oneOf":
                # The node union says only "none of them": ask the node's own branch.
                on_node(node_id, node_errors(str(node["type"]), node), path)
            else:
                on_node(node_id, [error], [])
        else:
            stops = stops or not _is_check(error)
            issues.append(DocumentIssue("document.malformed", path=".".join(path)))
    # An anchor is checked by a refinement zod reports as its own code — on a
    # node of a known type only: zod never reaches the anchor of an unknown one.
    for node_id, node in nodes.items():
        if not isinstance(node, dict) or node.get("type") not in known:
            continue
        anchor = node.get("anchor")
        if isinstance(anchor, str) and not _ANCHOR.fullmatch(anchor):
            issues.append(DocumentIssue("anchor.invalid", node_id=node_id))
    return issues, stops


def _can_contain(parent_type: str, child_type: str) -> bool:
    """`ElementRegistry.canContain`, from the exported placement rules."""
    known = elements()
    parent = known.get(parent_type)
    child = known.get(child_type)
    if parent is None or child is None or "container" not in parent:
        return False
    rule = parent["container"]
    if child.get("parents") is not None:
        return parent_type in child["parents"] and (
            "only" not in rule or child_type in rule["only"]
        )
    if "only" in rule:
        return child_type in rule["only"]
    return child_type not in rule.get("except", [])


def _structural_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    """`structuralIssues` in ``engine/src/core/validate.ts``, as ``checkForm`` reports it.

    TypeScript files these under the node they name; one that names no node
    (no root, too many nodes, too large) comes back as ``document.malformed``
    at ``nodes`` — kept so here, the original code in ``params``.
    """
    issues: list[DocumentIssue] = []
    nodes = _nodes(document)
    root = nodes.get("root")
    if not isinstance(root, dict) or root.get("type") != "root":
        return [
            DocumentIssue("document.malformed", path="nodes", params={"code": "document.noRoot"})
        ]
    bounds = limits()
    if len(nodes) > bounds["nodes"]:
        issues.append(
            DocumentIssue(
                "document.malformed", path="nodes", params={"code": "document.tooManyNodes"}
            )
        )

    known = elements()
    seen: set[str] = set()

    def visit(node: dict[str, Any], depth: int) -> None:
        node_id = str(node.get("id"))
        if node_id in seen:
            issues.append(DocumentIssue("document.duplicateReference", node_id=node_id))
            return
        seen.add(node_id)
        if node_id != "root" and depth > bounds["depth"]:
            issues.append(DocumentIssue("document.tooDeep", node_id=node_id))
        node_type = str(node.get("type"))
        element = known.get(node_type)
        if element is None:
            issues.append(DocumentIssue("element.unknown", node_id=node_id))
            return
        rule = element.get("container")
        children = node.get("children")
        if (rule is not None) != isinstance(children, list):
            issues.append(DocumentIssue("element.childrenMismatch", node_id=node_id))
        children = children if isinstance(children, list) else []
        if rule is not None and "min" in rule and len(children) < rule["min"]:
            issues.append(DocumentIssue("container.minimum", node_id=node_id))
        if rule is not None and "max" in rule and len(children) > rule["max"]:
            issues.append(DocumentIssue("container.full", node_id=node_id))
        for child_id in children:
            child = nodes.get(child_id)
            if not isinstance(child, dict):
                issues.append(DocumentIssue("document.missingChild", node_id=node_id))
                continue
            if not _can_contain(node_type, str(child.get("type"))):
                issues.append(DocumentIssue("placement.notAllowed", node_id=str(child.get("id"))))
            visit(child, depth + 1)

    visit(root, 0)
    for node_id in nodes:
        if node_id not in seen:
            issues.append(DocumentIssue("document.orphan", node_id=node_id))

    anchors: set[str] = set()
    for node_id, node in nodes.items():
        anchor = node.get("anchor")
        if not anchor:
            continue
        if anchor in anchors:
            issues.append(DocumentIssue("anchor.duplicate", node_id=node_id))
        anchors.add(anchor)

    size = len(json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode())
    if size > bounds["bytes"]:
        issues.append(
            DocumentIssue("document.malformed", path="nodes", params={"code": "document.tooLarge"})
        )
    return issues


def _translation_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    """`translationIssues`: each language's words must still be valid props.

    Every language held is read — multi-language switched on or not — and only
    the nodes a translation changes are checked again. ``checkForm`` reports a
    refusal as ``props.invalid`` on the node, at ``<locale>.<prop path>`` — as
    ``checkEmail`` does; so does this.
    """
    i18n = document.get("i18n")
    if not isinstance(i18n, dict):
        return []
    nodes = _nodes(document)
    issues: list[DocumentIssue] = []
    for locale, translation in (i18n.get("translations") or {}).items():
        if not translation:
            continue
        view = localize({**document, "i18n": {**i18n, "enabled": True}}, locale)
        view_nodes = _nodes(view)
        for node_id in translation.get("nodes") or {}:
            node = view_nodes.get(node_id)
            if not isinstance(node, dict) or node is nodes.get(node_id):
                continue
            for error in props_errors(str(node.get("type")), node.get("props")):
                where = ".".join(str(part) for part in error.absolute_path)
                issues.append(
                    DocumentIssue("props.invalid", node_id=node_id, path=f"{locale}.{where}")
                )
    return issues


# ── 2. each field's own checks ─────────────────────────────────


def _blank(value: Any) -> bool:
    return not isinstance(value, str) or _js.trim(value) == ""


def _is_input(node_type: str) -> bool:
    """A field that takes an answer from the visitor (the hidden field takes none)."""
    return node_type != "hidden" and answer_kinds().get(node_type, "none") != "none"


def _element_issues(node: dict[str, Any]) -> list[DocumentIssue]:
    node_id = str(node.get("id"))
    node_type = str(node.get("type"))
    props = node.get("props") or {}
    issues: list[DocumentIssue] = []
    if _is_input(node_type):
        if _blank(props.get("label")):
            issues.append(DocumentIssue("field.labelMissing", node_id=node_id, path="label"))
        checks = props.get("checks") or {}
        # Compiled by Python's `re`, not JavaScript's: see `custom_pattern` for where they differ.
        if checks.get("pattern") == "custom" and custom_pattern(str(checks.get("regex"))) is None:
            issues.append(
                DocumentIssue("field.patternInvalid", node_id=node_id, path="checks.regex")
            )
    if node_type in _OPTION_TYPES:
        options = [option for option in props.get("options") or [] if not _blank(option)]
        if len(options) < 2:
            issues.append(DocumentIssue("field.optionsMissing", node_id=node_id, path="options"))
    low, high = props.get("min"), props.get("max")
    if node_type == "slider" and _js.is_number(low) and _js.is_number(high) and low >= high:
        issues.append(DocumentIssue("field.rangeInvalid", node_id=node_id, path="max"))
    if node_type == "consent":
        if _blank(props.get("text")):
            issues.append(DocumentIssue("consent.textMissing", node_id=node_id, path="text"))
        link = props.get("linkUrl")
        if link and not is_safe_url(str(link)):
            issues.append(DocumentIssue("url.unsafe", node_id=node_id, path="linkUrl"))
    if node_type == "image" and props.get("media") and _blank(props.get("alt")):
        issues.append(DocumentIssue("image.altMissing", node_id=node_id, path="alt"))
    if node_type == "step" and not node.get("children"):
        issues.append(DocumentIssue("step.empty", node_id=node_id))
    return issues


# ── 3. the form's rules ────────────────────────────────────────


def _form_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    """``formIssues``: across fields and settings."""
    issues: list[DocumentIssue] = []
    fields = form_fields(document)
    inputs = [entry.node for entry in fields if takes_answer(entry.node)]

    # Every answer needs its own column.
    seen: set[str] = set()
    for node in inputs:
        key = node["props"]["key"]
        if key in seen:
            issues.append(
                DocumentIssue(
                    "field.keyDuplicate",
                    node_id=str(node.get("id")),
                    path="key",
                    params={"key": key},
                )
            )
        seen.add(key)

    # Logic may only read answers given before the field.
    before: set[str] = set()
    for entry in fields:
        props = entry.node.get("props") or {}
        logic = props.get("logic")
        if isinstance(logic, dict) and logic.get("enabled"):
            for rule in logic.get("rules") or []:
                if rule.get("key") not in before:
                    issues.append(
                        DocumentIssue(
                            "logic.unknownField",
                            node_id=str(entry.node.get("id")),
                            path="logic",
                            params={"key": rule.get("key")},
                        )
                    )
        if takes_answer(entry.node):
            before.add(props["key"])

    settings = document.get("settings") or {}
    auto_reply = settings.get("autoReply") or {}
    if auto_reply.get("enabled"):
        target = next(
            (node for node in inputs if node["props"]["key"] == auto_reply.get("to")), None
        )
        if target is None or target.get("type") != "email":
            issues.append(DocumentIssue("autoReply.noEmailField", path="settings.autoReply.to"))
    after = settings.get("after") or {}
    if after.get("mode") != "message" and _blank(after.get("redirectUrl")):
        issues.append(DocumentIssue("after.redirectMissing", path="settings.after.redirectUrl"))
    # Visitors are sent to the redirect and responses to the webhook: web
    # addresses (or a path on this site) only, never `javascript:` or `data:`.
    for value, path in (
        (after.get("redirectUrl"), "settings.after.redirectUrl"),
        (settings.get("webhook"), "settings.webhook"),
    ):
        if not _blank(value) and not is_safe_url(str(value)):
            issues.append(DocumentIssue("url.unsafe", path=path))
    notify = settings.get("notify") or {}
    if notify.get("enabled") and not notify.get("recipients"):
        issues.append(DocumentIssue("notify.noRecipients", path="settings.notify.recipients"))
    personal = personal_types()
    if any(node.get("type") in personal for node in inputs) and not any(
        node.get("type") == "consent" for node in inputs
    ):
        issues.append(DocumentIssue("consent.missing"))
    spam = settings.get("spam") or {}
    if spam.get("captcha") == "off" and not spam.get("honeypot"):
        issues.append(DocumentIssue("spam.none", path="settings.spam"))
    if _blank((document.get("meta") or {}).get("title")):
        issues.append(DocumentIssue("meta.titleMissing", path="meta.title"))
    if not inputs:
        issues.append(DocumentIssue("form.noFields"))
    return issues


# ── 4. the project's rules ─────────────────────────────────────


#: The fields of a media reference (`mediaRefSchema` in @builderset/engine).
_MEDIA_FIELDS = frozenset({"key", "width", "height", "mime", "size", "name"})


def _walk(value: Any, path: str = "") -> Iterator[tuple[str, Any]]:
    if isinstance(value, dict):
        for key, item in value.items():
            here = f"{path}.{key}" if path else str(key)
            yield here, item
            yield from _walk(item, here)
    elif isinstance(value, list):
        for index, item in enumerate(value):
            here = f"{path}.{index}" if path else str(index)
            yield here, item
            yield from _walk(item, here)


def _media_refs(value: Any) -> Iterator[tuple[str, str]]:
    """(path, key) for every `{key, …}` media reference inside a value."""
    for path, item in _walk(value):
        if (
            isinstance(item, dict)
            and isinstance(item.get("key"), str)
            and set(item) <= _MEDIA_FIELDS
        ):
            yield path, str(item["key"])


def media_keys(document: dict[str, Any]) -> list[str]:
    """Every storage key the form references (its pictures), once each."""
    keys: dict[str, None] = {}
    for node in _nodes(document).values():
        for _, key in _media_refs(node.get("props") or {}):
            keys[key] = None
        for _, key in _media_refs(node.get("style") or {}):
            keys[key] = None
    return list(keys)


def _media_issues(document: dict[str, Any], media_rule: MediaKeyRule) -> list[DocumentIssue]:
    issues: list[DocumentIssue] = []
    for node_id, node in _nodes(document).items():
        for value in (node.get("props") or {}, node.get("style") or {}):
            for path, key in _media_refs(value):
                code = media_rule(key)
                if code is not None:
                    issues.append(DocumentIssue(code, node_id=node_id, path=path))
    return issues


def _unknown_locale_issues(
    document: dict[str, Any], locales: Sequence[str] | None
) -> list[DocumentIssue]:
    if locales is None:
        return []
    return [
        DocumentIssue("i18n.locale.unknown", path="i18n", params={"locale": locale})
        for locale in unknown_locales(document, locales)
    ]


# ── the check ──────────────────────────────────────────────────


def check_form(
    document: Any,
    *,
    locales: Sequence[str] | None = None,
    check_media_key: MediaKeyRule | None = None,
) -> list[DocumentIssue]:
    """Every reason this form cannot be stored or published. Empty means it can.

    ``locales``: the languages the project writes in; a form holding another is
    ``i18n.locale.unknown``. Omitted, any language code is accepted.

    ``check_media_key``: the project's rule for media keys (see
    :data:`builderset.urls.MediaKeyRule`). Omitted, keys are checked for their
    shape only.

    Warnings (:func:`is_warning`) never stop a form; a draft may still carry the
    codes in :data:`DRAFT_TOLERATES` (:func:`is_draft_blocking`); publishing
    refuses every error (:func:`is_publish_blocking`).
    """
    if not isinstance(document, dict):
        return [DocumentIssue("document.notJson")]
    # 1. TypeScript parses first and, when that fails, reports only why.
    parsed, stops = _schema_issues(document)
    if not stops:
        parsed += _structural_issues(document) + _translation_issues(document)
    if parsed:
        return parsed

    issues: list[DocumentIssue] = []
    for node in _nodes(document).values():
        issues += _element_issues(node)
    issues += _form_issues(document)
    issues += _media_issues(document, check_media_key or media_key_shape)
    return issues + _unknown_locale_issues(document, locales)


__all__ = [
    "DRAFT_TOLERATES",
    "WARNINGS",
    "check_form",
    "is_draft_blocking",
    "is_publish_blocking",
    "is_warning",
    "media_keys",
]
