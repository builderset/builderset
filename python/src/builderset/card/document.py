"""Card documents: ``check_card`` — ``checkCard`` in ``packages/card/src/core/validate.ts``.

The editor, the renderer and this module agree on one definition of a card:
the JSON Schema ``@builderset/card`` generates from its own element schemas
(``packages/card/schema/card.schema.json``, shipped inside this package as
``schema.json``). The tests run the TypeScript package's fixtures through
``check_card`` and fail if the two sides ever disagree.

── What is checked, in the order TypeScript checks it ─────────────────────
1. Is it a card at all? The schema (every node's props against its element,
   the meta), anchors, then what a JSON Schema cannot say, read from its
   ``x-`` sections: one root, every child present and referenced once,
   placement (two sides in the root, elements on a side), the tree's limits —
   and each translation, read as a card of its own. As in TypeScript (zod),
   the tree's rules are skipped when a value is of the wrong kind, and still
   run when it only fails a check (too long, out of range); if any of this
   fails, those reasons are all that is reported.
2. The card's rules on its printed sides (``x-rules``): words and codes inside
   the safe area, type no smaller than 6 pt, QR codes of 15 mm or more, a
   chip on a bank card, links a phone may be sent to, variables the member
   fields have, a picture in every image frame.
3. The project's rules, which TypeScript leaves to the host: every media key
   passing ``check_media_key``, every language in ``locales``.

Error codes are the TypeScript package's own. Some are warnings
(:data:`WARNINGS`): worth telling the person designing the card, never a
reason to refuse it.
"""

from __future__ import annotations

import json
import math
import re
from collections.abc import Iterator, Sequence
from typing import Any

from builderset.card.schema import (
    default_fields,
    elements,
    formats,
    limits,
    node_errors,
    props_errors,
    rules,
    validator,
    variable_pattern,
)
from builderset.form import _js
from builderset.i18n import localize, unknown_locales
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule, is_safe_url, media_key_shape

#: What a saved DRAFT may still carry — ``CARD_DRAFT_TOLERATES`` in
#: ``packages/card/src/core/validate.ts``, held to it by the tests through
#: ``packages/card/fixtures/draft.json``: a variable the member data does not
#: have yet, a language not yet allowed. Never a malformed tree or an unsafe link.
DRAFT_TOLERATES = frozenset({"variable.unknown", "i18n.locale.unknown"})

#: The codes ``checkCard`` reports as warnings: never a reason to refuse a card.
WARNINGS = frozenset(
    {
        "side.empty",
        "frame.unplaced",
        "card.outsideSafe",
        "card.textTooSmall",
        "card.qrTooSmall",
        "card.chipMissing",
        "code.empty",
        "barcode.unencodable",
        "image.missing",
        "meta.nameMissing",
    }
)

#: A host's member field: ``{"path": "member.name", "kind": "text" | "photo"}``.
CardField = dict[str, Any]

_ANCHOR = re.compile(r"[A-Za-z][A-Za-z0-9_-]{0,79}")
# Whitespace and control characters inside a scheme: how `java\tscript:` hides.
_INVISIBLE = re.compile(f"[{_js.WS}\\x00-\\x1f\\x7f]")
_SCHEME = re.compile(r"^([a-z][a-z0-9+.-]*):", re.IGNORECASE)


def is_warning(issue: DocumentIssue) -> bool:
    """Whether ``checkCard`` reports this issue as a warning rather than an error."""
    return issue.code in WARNINGS


def is_draft_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a card's draft from being saved."""
    return not is_warning(issue) and issue.code not in DRAFT_TOLERATES


def is_print_blocking(issue: DocumentIssue) -> bool:
    """Whether this issue stops a card from being printed: every error does."""
    return not is_warning(issue)


# ── 1. is it a card ────────────────────────────────────────────


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
    """The JSON Schema's verdict, named as ``checkCard`` names zod's; and whether zod stops there."""
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
            # zod's issue path is nodes.<id>.<field>.<rest>: `checkCard` keeps <rest>.
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
    # An anchor is checked by a refinement zod reports as its own code.
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
    """`structuralIssues` in ``engine/src/core/validate.ts``, as ``checkCard`` reports it.

    One that names no node (no root, too many nodes, too large) comes back as
    ``document.malformed`` at ``nodes``, the original code in ``params``.
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
    """`translationIssues`: each language's words must still be valid props."""
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


# ── 2. the card's own rules ────────────────────────────────────


def side_of(document: dict[str, Any], face: str) -> dict[str, Any] | None:
    """The side node of a face (``front`` or ``back``), if the card has one."""
    nodes = _nodes(document)
    for side_id in (nodes.get("root") or {}).get("children") or []:
        side = nodes.get(side_id)
        if (
            isinstance(side, dict)
            and side.get("type") == "side"
            and (side.get("props") or {}).get("face") == face
        ):
            return side
    return None


def elements_of(document: dict[str, Any], face: str) -> list[dict[str, Any]]:
    """The elements placed on a face, bottom to top."""
    side = side_of(document, face)
    nodes = _nodes(document)
    found = [nodes.get(child) for child in (side or {}).get("children") or []]
    return [node for node in found if isinstance(node, dict)]


def printed_faces(document: dict[str, Any]) -> list[str]:
    """The faces printed: the front, and the back on a two-sided card."""
    root = _nodes(document).get("root") or {}
    return ["front", "back"] if (root.get("props") or {}).get("sides") == 2 else ["front"]


def _finite(value: Any) -> float:
    return float(value) if _js.is_number(value) and math.isfinite(value) else 0.0


def frame_of(node: dict[str, Any]) -> tuple[float, float, float, float, float]:
    """`frameOf`: (x, y, w, h, r), anything missing 0, no size below 0, the angle in [0, 360)."""
    raw = (node.get("props") or {}).get("frame")
    frame = raw if isinstance(raw, dict) else {}
    turned = _finite(frame.get("r")) % 360
    if turned >= 359.9999:
        turned = 0.0
    return (
        _finite(frame.get("x")),
        _finite(frame.get("y")),
        max(0.0, _finite(frame.get("w"))),
        max(0.0, _finite(frame.get("h"))),
        turned,
    )


def frame_bounds(
    x: float, y: float, w: float, h: float, r: float
) -> tuple[float, float, float, float]:
    """`frameBounds`: the box a frame covers once rotated, as (left, top, right, bottom)."""
    if not r:
        return x, y, x + w, y + h
    radians = r * math.pi / 180
    cos = abs(math.cos(radians))
    sin = abs(math.sin(radians))
    width = w * cos + h * sin
    height = w * sin + h * cos
    left = x + w / 2 - width / 2
    top = y + h / 2 - height / 2
    return left, top, left + width, top + height


def variables_in(text: str) -> list[str]:
    """`variablesIn`: every variable path in a piece of text, in order, repeats included."""
    return [match.group(1) for match in variable_pattern().finditer(text)]


def is_unsafe_code_link(data: str) -> bool:
    """`isUnsafeCodeLink`: whether what a QR code encodes is a link a phone should not open."""
    found = _SCHEME.match(_INVISIBLE.sub("", data))
    if not found:
        return False
    scheme = found.group(1).lower()
    if scheme in rules()["dangerousSchemes"]:
        return True
    if scheme in rules()["webSchemes"]:
        return not is_safe_url(data)
    return False


def unencodable_chars(text: str) -> list[str]:
    """`unencodableChars`: characters Code 128 cannot encode, in order, once."""
    bounds = rules()["barcodeChars"]
    bad: dict[str, None] = {}
    for char in text:
        if not bounds["min"] <= ord(char) <= bounds["max"]:
            bad[char] = None
    return list(bad)


def _js_round_tenth(value: float) -> float | int:
    """`Math.round(value * 10) / 10`: halves round up, as JavaScript rounds them."""
    rounded = math.floor(value * 10 + 0.5) / 10
    return int(rounded) if rounded.is_integer() else rounded


def _element_issues(
    node: dict[str, Any], face: str, context: dict[str, Any]
) -> list[DocumentIssue]:
    """One shown element's issues on a printed face, in `cardIssues`' order."""
    found = rules()
    issues: list[DocumentIssue] = []
    props = node["props"]
    node_id = node["id"]
    kind = node["type"]
    at = {"face": face}
    x, y, w, h, r = frame_of(node)
    if not (w > 0 and h > 0):
        return [DocumentIssue("frame.unplaced", node_id=node_id, path="frame", params=at)]
    if context["check_safe"] and kind in found["safeTypes"]:
        left, top, right, bottom = frame_bounds(x, y, w, h, r)
        inner = context["inner"]
        if left < inner[0] or top < inner[1] or right > inner[2] or bottom > inner[3]:
            issues.append(
                DocumentIssue("card.outsideSafe", node_id=node_id, path="frame", params=at)
            )
    size = props.get("size")
    if kind in found["textTypes"] and _js.is_number(size) and size < found["minTextPt"]:
        issues.append(
            DocumentIssue(
                "card.textTooSmall", node_id=node_id, path="size", params={**at, "size": size}
            )
        )
    prop = found["variableProps"].get(kind)
    words = props.get(prop) if prop else None
    if prop and isinstance(words, str):
        for path in dict.fromkeys(variables_in(words)):
            if path not in context["text_paths"]:
                issues.append(
                    DocumentIssue(
                        "variable.unknown", node_id=node_id, path=prop, params={"path": path}
                    )
                )
    data = props.get("data")
    if kind in ("qr", "barcode") and not _js.trim(data if isinstance(data, str) else ""):
        issues.append(DocumentIssue("code.empty", node_id=node_id, path="data", params=at))
    if kind == "qr":
        smallest = min(w, h)
        if smallest < found["minQrMm"]:
            params = {**at, "size": _js_round_tenth(smallest)}
            issues.append(
                DocumentIssue("card.qrTooSmall", node_id=node_id, path="frame", params=params)
            )
        if isinstance(data, str) and is_unsafe_code_link(data):
            issues.append(DocumentIssue("url.unsafe", node_id=node_id, path="data"))
    if kind == "barcode" and isinstance(data, str):
        bad = unencodable_chars(variable_pattern().sub("", data))
        if bad:
            issues.append(
                DocumentIssue(
                    "barcode.unencodable",
                    node_id=node_id,
                    path="data",
                    params={"chars": "".join(bad)},
                )
            )
    bind = props.get("bind")
    if kind == "photo" and isinstance(bind, str) and bind not in context["photo_paths"]:
        issues.append(
            DocumentIssue("variable.unknown", node_id=node_id, path="bind", params={"path": bind})
        )
    if kind == "image" and not props.get("media"):
        issues.append(DocumentIssue("image.missing", node_id=node_id, path="media", params=at))
    return issues


def _card_issues(document: dict[str, Any], fields: Sequence[CardField]) -> list[DocumentIssue]:
    """`cardIssues`: the card's own rules, on its printed sides."""
    nodes = _nodes(document)
    root = nodes["root"]
    faces = [((nodes.get(side) or {}).get("props") or {}).get("face") for side in root["children"]]
    if not ("front" in faces and "back" in faces):
        return [DocumentIssue("card.sidesInvalid", node_id="root")]

    card = root["props"]
    found = rules()
    safe = card["print"]["safe"]
    tolerance = found["tolerance"]
    context = {
        "text_paths": {field["path"] for field in fields if field.get("kind") == "text"},
        "photo_paths": {field["path"] for field in fields if field.get("kind") == "photo"},
        "check_safe": formats()[card["format"]]["print"] and safe > 0,
        "inner": (
            safe - tolerance,
            safe - tolerance,
            card["width"] - safe + tolerance,
            card["height"] - safe + tolerance,
        ),
    }

    issues: list[DocumentIssue] = []
    for face in printed_faces(document):
        side = side_of(document, face)
        shown = [node for node in elements_of(document, face) if not node.get("hidden")]
        if side is not None and not shown:
            issues.append(DocumentIssue("side.empty", node_id=side["id"], params={"face": face}))
        for node in shown:
            issues += _element_issues(node, face, context)

    if card["format"] == "bank" and not any(
        node["type"] == "chip" and not node.get("hidden") for node in elements_of(document, "front")
    ):
        front = side_of(document, "front")
        issues.append(DocumentIssue("card.chipMissing", node_id=front["id"] if front else None))
    if not _js.trim(str((document.get("meta") or {}).get("name", ""))):
        issues.append(DocumentIssue("meta.nameMissing", path="meta.name"))
    return issues


# ── 3. the project's rules ─────────────────────────────────────


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
    """Every storage key the card references (side pictures, images, logo files), once each."""
    keys: dict[str, None] = {}
    for node in _nodes(document).values():
        for _, key in _media_refs(node.get("props") or {}):
            keys[key] = None
    return list(keys)


def _media_issues(document: dict[str, Any], media_rule: MediaKeyRule) -> list[DocumentIssue]:
    issues: list[DocumentIssue] = []
    for node_id, node in _nodes(document).items():
        for path, key in _media_refs(node.get("props") or {}):
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


def check_card(
    document: Any,
    *,
    fields: Sequence[CardField] | None = None,
    locales: Sequence[str] | None = None,
    check_media_key: MediaKeyRule | None = None,
) -> list[DocumentIssue]:
    """Every reason this card cannot be stored or printed. Empty means it can.

    ``fields``: the member fields the project's cards may use, as
    ``{"path": "member.name", "kind": "text"}`` (``"photo"`` for a picture);
    omitted, the default member fields (``x-fields``). A variable outside them
    is ``variable.unknown``.

    ``locales``: the languages the project writes in; a card holding another is
    ``i18n.locale.unknown``. Omitted, any language code is accepted.

    ``check_media_key``: the project's rule for media keys (see
    :data:`builderset.urls.MediaKeyRule`). Omitted, keys are checked for their
    shape only.

    Warnings (:func:`is_warning`) never stop a card; a draft may still carry the
    codes in :data:`DRAFT_TOLERATES` (:func:`is_draft_blocking`); printing
    refuses every error (:func:`is_print_blocking`).
    """
    if not isinstance(document, dict):
        return [DocumentIssue("document.notJson")]
    parsed, stops = _schema_issues(document)
    if not stops:
        parsed += _structural_issues(document) + _translation_issues(document)
    if parsed:
        return parsed

    issues = _card_issues(document, default_fields() if fields is None else fields)
    issues += _media_issues(document, check_media_key or media_key_shape)
    return issues + _unknown_locale_issues(document, locales)


__all__ = [
    "DRAFT_TOLERATES",
    "WARNINGS",
    "CardField",
    "check_card",
    "elements_of",
    "frame_bounds",
    "frame_of",
    "is_draft_blocking",
    "is_print_blocking",
    "is_unsafe_code_link",
    "is_warning",
    "media_keys",
    "printed_faces",
    "side_of",
    "unencodable_chars",
    "variables_in",
]
