"""Popup documents: ``check_popup`` — ``checkPopup`` in ``packages/popup/src/core/validate.ts``.

The editor, the renderer and this module agree on one definition of a popup:
the JSON Schema ``@builderset/popup`` generates from its own element schemas
(``packages/popup/schema/popup.schema.json``, shipped inside this package as
``schema.json``). The tests run the TypeScript package's fixtures through
``check_popup`` and fail if the two sides ever disagree.

── What is checked, in the order TypeScript checks it ─────────────────────
1. Is it a popup at all? The schema (the root's format, every element's
   props, the meta), anchors, then what a JSON Schema cannot say, read from
   its ``x-`` sections: one root, every child present and referenced once,
   placement (elements in the root), the tree's limits — and each
   translation, read as a popup of its own. If any of this fails, those
   reasons are all that is reported.
2. Each element's own checks: a link that goes somewhere safe, an input with
   a name and a label, a picture's description.
3. The popup's rules: something on it, a way to close it, one name per
   input, a button that sends the inputs, variables the project fills in,
   elements inside it, display rules that can match, and the gentler
   warnings (every visit, a modal the moment the page opens).
4. The project's rules, which TypeScript leaves to the host: every media key
   passing ``check_media_key``, every language in ``locales``.

Error codes are the TypeScript package's own. Some are warnings
(:data:`WARNINGS`): worth telling the person building the popup, never a
reason to refuse it.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator, Sequence
from typing import Any

from builderset.form import _js
from builderset.i18n import localize, unknown_locales
from builderset.issues import DocumentIssue
from builderset.popup.schema import (
    default_variables,
    elements,
    limits,
    node_errors,
    popup_types,
    props_errors,
    validator,
)
from builderset.urls import MediaKeyRule, is_safe_url, media_key_shape

#: What a saved DRAFT may still carry — ``POPUP_DRAFT_TOLERATES`` in
#: ``packages/popup/src/core/validate.ts``, held to it by the tests through
#: ``packages/popup/fixtures/draft.json``: an empty popup, a link not yet
#: written, a rule half typed. What a draft may never carry is a malformed tree,
#: an unsafe link or a media key the project's rule refuses. Going live checks
#: strictly: every error blocks it, warnings never do.
DRAFT_TOLERATES = frozenset(
    {
        "popup.empty",
        "popup.noClose",
        "action.linkMissing",
        "input.nameMissing",
        "input.nameDuplicate",
        "display.noDevice",
        "display.selectorMissing",
        "display.pagesMissing",
        "display.ruleInvalid",
        "display.datesInvalid",
        "i18n.locale.unknown",
    }
)

#: The codes ``checkPopup`` reports as warnings: never a reason to refuse a popup.
WARNINGS = frozenset(
    {
        "input.labelMissing",
        "input.noSubmit",
        "image.altMissing",
        "variable.unknown",
        "element.outside",
        "display.everyVisit",
        "display.interstitial",
    }
)

_ANCHOR = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}")
#: A display rule a path can match: a path, `*` for any part, no spaces, no query or hash.
_RULE = re.compile(f"/?[^{_js.WS}?#]*")
#: `{{ path }}` — ``VARIABLE_TOKEN`` in ``variables.ts``.
_VARIABLE = re.compile(
    rf"\{{\{{[{_js.WS}]*([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*){{0,4}})[{_js.WS}]*\}}\}}"
)


def is_warning(issue: DocumentIssue) -> bool:
    """Whether ``checkPopup`` reports this issue as a warning rather than an error."""
    return issue.code in WARNINGS


def is_draft_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a popup's draft from being saved."""
    return not is_warning(issue) and issue.code not in DRAFT_TOLERATES


def is_publish_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a popup from going live: every error does."""
    return not is_warning(issue)


# ── 1. is it a popup ───────────────────────────────────────────


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
    """The JSON Schema's verdict, named as ``checkPopup`` names zod's.

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
            # zod's issue path is nodes.<id>.<field>.<rest>: `checkPopup` keeps <rest>.
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
    """`structuralIssues` in ``engine/src/core/validate.ts``, as ``checkPopup`` reports it.

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
    the nodes a translation changes are checked again. ``checkPopup`` reports a
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


# ── 2. each element's own checks ───────────────────────────


def _blank(value: Any) -> bool:
    return not isinstance(value, str) or _js.trim(value) == ""


def _props(node: dict[str, Any]) -> dict[str, Any]:
    props = node.get("props")
    return props if isinstance(props, dict) else {}


def _action_issues(node_id: str, props: dict[str, Any]) -> list[DocumentIssue]:
    """``actionIssues``: a link that goes nowhere, or somewhere it must not."""
    if props.get("action") != "link":
        return []
    url = props.get("url")
    if _blank(url):
        return [DocumentIssue("action.linkMissing", node_id=node_id, path="url")]
    if not is_safe_url(str(url)):
        return [DocumentIssue("url.unsafe", node_id=node_id, path="url")]
    return []


def _element_issues(node: dict[str, Any]) -> list[DocumentIssue]:
    node_id = str(node.get("id"))
    node_type = node.get("type")
    props = _props(node)
    if node_type in {"heading", "text", "label", "button"}:
        return _action_issues(node_id, props)
    if node_type == "input":
        if not props.get("name"):
            return [DocumentIssue("input.nameMissing", node_id=node_id, path="name")]
        if _blank(props.get("label")) and _blank(props.get("placeholder")):
            return [DocumentIssue("input.labelMissing", node_id=node_id, path="label")]
    if node_type == "image" and props.get("media") and _blank(props.get("alt")):
        return [DocumentIssue("image.altMissing", node_id=node_id, path="alt")]
    return []


# ── 3. the popup's rules ───────────────────────────────────────


def _root(document: dict[str, Any]) -> dict[str, Any]:
    root = _nodes(document).get(document.get("root") or "root")
    return root if isinstance(root, dict) else {}


def elements_of(document: dict[str, Any]) -> list[dict[str, Any]]:
    """The popup's elements, in stacking order (last on top)."""
    nodes = _nodes(document)
    found = [nodes.get(node_id) for node_id in _root(document).get("children") or []]
    return [node for node in found if isinstance(node, dict)]


def _number(value: Any) -> float:
    return float(value) if _js.is_number(value) else 0.0


def _frame(node: dict[str, Any]) -> tuple[float, float, float, float]:
    """``frameOf``: x, y and a size of at least 0, anything missing read as 0."""
    frame = _props(node).get("frame")
    frame = frame if isinstance(frame, dict) else {}
    return (
        _number(frame.get("x")),
        _number(frame.get("y")),
        max(0.0, _number(frame.get("w"))),
        max(0.0, _number(frame.get("h"))),
    )


def _words_of(node: dict[str, Any]) -> str:
    """The words a visitor reads in an element, variables included."""
    props = _props(node)
    text = props.get("text")
    if isinstance(text, list):
        return "".join(str(run.get("text", "")) for run in text if isinstance(run, dict))
    if node.get("type") == "qr" and isinstance(props.get("data"), str):
        return str(props["data"])
    return ""


def can_close(document: dict[str, Any]) -> bool:
    """Whether a visitor can close it: a close button shown, a "close" click, the page behind, or Esc."""
    format_ = _props(_root(document))
    motion = format_.get("motion") or {}
    shown = [node for node in elements_of(document) if not node.get("hidden")]
    overlay = bool(popup_types().get(str(format_.get("type")), {}).get("overlay"))
    return bool(
        (motion.get("closeX") and any(node.get("type") == "close" for node in shown))
        or any(_props(node).get("action") == "close" for node in shown)
        or (overlay and motion.get("outside"))
        or motion.get("esc")
    )


def _popup_issues(document: dict[str, Any], variables: Sequence[str]) -> list[DocumentIssue]:
    """``popupIssues``: across the elements and the format."""
    issues: list[DocumentIssue] = []
    format_ = _props(_root(document))
    display = format_.get("display") or {}
    shown = [node for node in elements_of(document) if not node.get("hidden")]

    if not shown:
        issues.append(DocumentIssue("popup.empty"))
    if format_.get("type") != "inline" and not can_close(document):
        issues.append(DocumentIssue("popup.noClose", path="motion"))

    # One answer, one name: a second input with the same name would be lost.
    names: set[str] = set()
    for node in shown:
        name = _props(node).get("name")
        if node.get("type") != "input" or not name:
            continue
        if name in names:
            issues.append(
                DocumentIssue(
                    "input.nameDuplicate",
                    node_id=str(node.get("id")),
                    path="name",
                    params={"name": name},
                )
            )
        names.add(name)
    if any(node.get("type") == "input" for node in shown) and not any(
        node.get("type") == "button" and _props(node).get("action") == "submit" for node in shown
    ):
        issues.append(DocumentIssue("input.noSubmit"))

    known = set(variables)
    width = _number(format_.get("width"))
    height = _number(format_.get("height"))
    for node in shown:
        node_id = str(node.get("id"))
        for path in _VARIABLE.findall(_words_of(node)):
            if path not in known:
                issues.append(
                    DocumentIssue("variable.unknown", node_id=node_id, params={"path": path})
                )
        x, y, w, h = _frame(node)
        # Nothing of it is inside the popup: a visitor never sees it.
        if x >= width or y >= height or x + w <= 0 or y + h <= 0:
            issues.append(DocumentIssue("element.outside", node_id=node_id, path="frame"))

    if not display.get("desktop") and not display.get("mobile"):
        issues.append(DocumentIssue("display.noDevice", path="display"))
    if display.get("trigger") == "click" and _blank(display.get("selector")):
        issues.append(DocumentIssue("display.selectorMissing", path="display.selector"))
    rules = [rule for rule in display.get("rules") or [] if isinstance(rule, str)]
    if display.get("pages") == "only" and all(_blank(rule) for rule in rules):
        issues.append(DocumentIssue("display.pagesMissing", path="display.rules"))
    for index, rule in enumerate(rules):
        if not _blank(rule) and not _RULE.fullmatch(_js.trim(rule)):
            issues.append(
                DocumentIssue(
                    "display.ruleInvalid", path=f"display.rules.{index}", params={"rule": rule}
                )
            )
    starts, ends = display.get("starts"), display.get("ends")
    if starts and ends and ends < starts:
        issues.append(DocumentIssue("display.datesInvalid", path="display.ends"))
    if display.get("frequency") == "every" and format_.get("type") != "inline":
        issues.append(DocumentIssue("display.everyVisit", path="display.frequency"))
    # Google ranks pages lower when a popup covers the content the moment it opens.
    if format_.get("type") in {"modal", "fullscreen"} and display.get("trigger") == "load":
        issues.append(DocumentIssue("display.interstitial", path="display.trigger"))
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
    """Every storage key the popup references (its pictures and logos), once each."""
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


def check_popup(
    document: Any,
    *,
    locales: Sequence[str] | None = None,
    variables: Sequence[str] | None = None,
    check_media_key: MediaKeyRule | None = None,
) -> list[DocumentIssue]:
    """Every reason this popup cannot be stored or published. Empty means it can.

    ``locales``: the languages the project writes in; a popup holding another
    is ``i18n.locale.unknown``. Omitted, any language code is accepted.

    ``variables``: the variable paths the project fills in. Omitted, the
    popup's defaults (``x-variables``: ``visitor.first_name``, …).

    ``check_media_key``: the project's rule for media keys (see
    :data:`builderset.urls.MediaKeyRule`). Omitted, keys are checked for their
    shape only.

    Warnings (:func:`is_warning`) never stop a popup; a draft may still carry
    the codes in :data:`DRAFT_TOLERATES` (:func:`is_draft_blocking`);
    publishing refuses every error (:func:`is_publish_blocking`).
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
    issues += _popup_issues(
        document, default_variables() if variables is None else tuple(variables)
    )
    issues += _media_issues(document, check_media_key or media_key_shape)
    return issues + _unknown_locale_issues(document, locales)


__all__ = [
    "DRAFT_TOLERATES",
    "WARNINGS",
    "can_close",
    "check_popup",
    "elements_of",
    "is_draft_blocking",
    "is_publish_blocking",
    "is_warning",
    "media_keys",
]
