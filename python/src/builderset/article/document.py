"""Article builder documents: validation, legacy conversion, text and media.

The editor, the renderer and this module all agree on one definition of a
document — the JSON Schema that ``@builderset/article`` generates from its own
element schemas, copied beside this file as ``builder_schema.json`` by
``scripts/sync-builder-contract.mjs`` (the API's containers mount only
``api/``, so the package itself is out of reach at runtime; never edit the copy). A contract test runs the package's
committed fixtures through ``check_document`` and fails if the two sides ever
disagree about a valid or an invalid document.

── Two layers ──────────────────────────────────────────────────────────────
1. The schema: every node's props against its element, the style tokens, the
   document envelope. Checked with ``jsonschema``.
2. What a JSON Schema cannot say, read from the same file's ``x-`` sections
   rather than restated here: one root, every child present and referenced
   once, placement (which element may sit in which), depth, size, unique
   anchors — plus the security rules: every URL on the allow-list of schemes,
   embeds only from allowed providers, media only from the article folders,
   and no picture still waiting to be uploaded.

Error codes are the core package's own, so the admin shows the server's refusal
in the same words its own checker would have used.
"""

from __future__ import annotations

import json
import re
import uuid as uuid_module
from collections.abc import Iterator, Sequence
from dataclasses import dataclass, field, replace
from functools import cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from jsonschema import Draft202012Validator

from app.core.content_i18n import document_locales, localize, unknown_locales
from app.integrations import storage

SCHEMA_PATH = Path(__file__).with_name("builder_schema.json")

#: Where an article's media may live. Anything else — a CV, a contract, a
#: brand's mark — must never be linked from a public page.
ARTICLE_FOLDERS = frozenset({"article-image", "article-media", "article-file"})

#: What an AUTOSAVE may still contain — ``ARTICLE_DRAFT_TOLERATES`` in
#: Builderset's ``packages/article/src/core/draft.ts``, held to it by the contract test
#: through ``tests/fixtures/builder/draft.json``. A draft is work in progress: a
#: pasted picture not yet uploaded, an embed URL half-typed, a title not yet
#: written. None of them can reach a reader — the site renders ``document``,
#: never the draft — and publishing refuses them. What is NEVER tolerated, even
#: in a draft, is anything unsafe to store: a malformed tree, an unsafe URL,
#: media from outside the article folders.
DRAFT_TOLERATES = frozenset(
    {
        "media.external",
        "meta.titleMissing",
        "embed.notAllowed",
        "embed.providerMismatch",
        "footnote.missing",
        "i18n.locale.unknown",
    }
)

#: Keys in element props that hold a URL a reader is sent to.
_URL_KEYS = frozenset({"href", "source", "canonical"})

_ANCHOR = re.compile(r"^[A-Za-z][\w-]{0,79}$")
_SAFE_SCHEMES = frozenset({"http", "https", "mailto", "tel"})
_CONTROL = re.compile(r"[\s\x00-\x1f\x7f]")


@dataclass(frozen=True)
class DocumentIssue:
    code: str
    node_id: str | None = None
    path: str | None = None
    params: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "node_id": self.node_id,
            "path": self.path,
            "params": self.params,
        }


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


def limits() -> dict[str, int]:
    values: dict[str, int] = _schema()["x-limits"]
    return values


@cache
def _embed_patterns() -> dict[str, list[re.Pattern[str]]]:
    raw: dict[str, list[str]] = _schema()["x-embed-patterns"]
    return {
        provider: [re.compile(source, re.IGNORECASE) for source in sources]
        for provider, sources in raw.items()
    }


# ── small rules mirrored from the core package ─────────────────


def is_safe_url(value: str) -> bool:
    """`isSafeUrl` in ``engine/src/core/url.ts``, rule for rule."""
    url = value.strip()
    if not url or len(url) > 2000 or _CONTROL.search(url):
        return False
    if url.startswith("#"):
        return bool(re.fullmatch(r"#[A-Za-z][\w-]*", url))
    if url.startswith("/"):
        return not url.startswith("//")
    try:
        scheme = urlparse(url).scheme.lower()
    except ValueError:
        return False
    return scheme in _SAFE_SCHEMES and url.lower().startswith(f"{scheme}:")


def detect_embed_provider(url: str) -> str | None:
    value = url.strip()
    for provider, patterns in _embed_patterns().items():
        if any(pattern.match(value) for pattern in patterns):
            return provider
    return None


def _can_contain(parent_type: str, child_type: str) -> bool:
    """`ElementRegistry.canContain`, from the exported placement rules."""
    elements = _elements()
    parent = elements.get(parent_type, {})
    child = elements.get(child_type)
    rule = parent.get("container")
    if rule is None or child is None:
        return False
    parents = child.get("parents")
    if parents is not None:
        return parent_type in parents and ("only" not in rule or child_type in rule["only"])
    if "only" in rule:
        return child_type in rule["only"]
    return child_type not in rule.get("except", [])


# ── walking props ──────────────────────────────────────────────


def _walk(value: Any, path: str = "") -> Iterator[tuple[str, str, Any]]:
    """Every (path, key, value) pair inside a props value, depth first."""
    if isinstance(value, dict):
        for key, inner in value.items():
            here = f"{path}.{key}" if path else str(key)
            yield here, str(key), inner
            yield from _walk(inner, here)
    elif isinstance(value, list):
        for index, inner in enumerate(value):
            yield from _walk(inner, f"{path}.{index}" if path else str(index))


def _media_refs(value: Any) -> Iterator[tuple[str, str]]:
    """(path, key) for every media reference: an object with a string `key`."""
    for path, key, inner in _walk(value):
        if isinstance(inner, dict) and isinstance(inner.get("key"), str):
            yield path, str(inner["key"])
        del key


def media_keys(document: dict[str, Any]) -> list[str]:
    """Every storage key the document references, meta included, once each."""
    keys: dict[str, None] = {}
    for _, key in _media_refs(document.get("meta", {})):
        keys[key] = None
    for node in (document.get("nodes") or {}).values():
        for _, key in _media_refs(node.get("props", {})):
            keys[key] = None
        for _, key in _media_refs(node.get("style", {})):
            keys[key] = None
    return list(keys)


# ── the check ──────────────────────────────────────────────────


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
    """`structuralIssues` in ``engine/src/core/validate.ts``."""
    issues: list[DocumentIssue] = []
    nodes: dict[str, dict[str, Any]] = document.get("nodes") or {}
    root = nodes.get("root")
    if not root or root.get("type") != "root":
        return [DocumentIssue("document.noRoot")]

    bounds = limits()
    if len(nodes) > bounds["nodes"]:
        issues.append(DocumentIssue("document.tooManyNodes", params={"max": bounds["nodes"]}))

    elements = _elements()
    seen: set[str] = set()

    def visit(node: dict[str, Any], depth: int) -> None:
        node_id = str(node.get("id"))
        if node_id in seen:
            issues.append(DocumentIssue("document.duplicateReference", node_id=node_id))
            return
        seen.add(node_id)
        if node_id != "root" and depth > bounds["depth"]:
            issues.append(DocumentIssue("document.tooDeep", node_id=node_id))
        element = elements.get(str(node.get("type")))
        if element is None:
            issues.append(
                DocumentIssue("element.unknown", node_id=node_id, params={"type": node.get("type")})
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
        for child_id in children:
            child = nodes.get(child_id)
            if child is None:
                issues.append(DocumentIssue("document.missingChild", node_id=node_id))
                continue
            if not _can_contain(str(node.get("type")), str(child.get("type"))):
                issues.append(DocumentIssue("placement.notAllowed", node_id=str(child_id)))
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
        if not isinstance(anchor, str) or not _ANCHOR.match(anchor):
            issues.append(DocumentIssue("anchor.invalid", node_id=node_id))
        elif anchor in anchors:
            issues.append(DocumentIssue("anchor.duplicate", node_id=node_id))
        anchors.add(str(anchor))

    size = len(json.dumps(document, separators=(",", ":")).encode())
    if size > bounds["bytes"]:
        issues.append(DocumentIssue("document.tooLarge", params={"max": bounds["bytes"]}))
    return issues


def _security_issues(document: dict[str, Any]) -> list[DocumentIssue]:
    """URLs, embeds, media folders and pending uploads — for every node."""
    issues: list[DocumentIssue] = []
    footnotes = {
        node_id
        for node_id, node in (document.get("nodes") or {}).items()
        if node.get("type") == "footnote"
    }

    def check_media(node_id: str | None, value: Any) -> None:
        for path, key in _media_refs(value):
            try:
                storage.validate_key(key)
            except storage.InvalidKey:
                issues.append(DocumentIssue("media.invalidKey", node_id=node_id, path=path))
                continue
            if key.split("/", 1)[0] not in ARTICLE_FOLDERS:
                issues.append(DocumentIssue("media.wrongFolder", node_id=node_id, path=path))

    for node_id, node in (document.get("nodes") or {}).items():
        props = node.get("props") or {}
        for path, key, value in _walk(props):
            if key in _URL_KEYS and isinstance(value, str) and value and not is_safe_url(value):
                issues.append(DocumentIssue("url.unsafe", node_id=node_id, path=path))
            # A footnote mark's `ref` must name a footnote node in this document.
            if key == "ref" and isinstance(value, str) and value not in footnotes:
                issues.append(DocumentIssue("footnote.missing", node_id=node_id, path=path))
        check_media(node_id, props)
        check_media(node_id, node.get("style") or {})

        if node.get("type") == "image" and props.get("pendingUrl"):
            issues.append(DocumentIssue("media.external", node_id=node_id, path="media"))
        if node.get("type") == "embed" and str(props.get("url", "")).strip():
            provider = detect_embed_provider(str(props["url"]))
            if provider is None:
                issues.append(DocumentIssue("embed.notAllowed", node_id=node_id, path="url"))
            elif provider != props.get("provider"):
                issues.append(DocumentIssue("embed.providerMismatch", node_id=node_id, path="url"))

    meta = document.get("meta") or {}
    check_media(None, meta)
    canonical = (meta.get("seo") or {}).get("canonical")
    if isinstance(canonical, str) and canonical and not is_safe_url(canonical):
        issues.append(DocumentIssue("url.unsafe", path="meta.seo.canonical"))
    if not str(meta.get("title", "")).strip():
        issues.append(DocumentIssue("meta.titleMissing", path="meta.title"))
    return issues


def check_document(document: Any, *, locales: Sequence[str] | None = None) -> list[DocumentIssue]:
    """Every reason this document cannot be stored. Empty means it can.

    ``locales``: the languages the project writes in; a document holding another
    is ``i18n.locale.unknown``. Omitted, any language code is accepted.
    """
    if not isinstance(document, dict):
        return [DocumentIssue("document.notJson")]
    schema_issues = _schema_issues(document)
    if any(issue.code == "document.malformed" for issue in schema_issues):
        # The envelope itself is wrong; walking a tree that is not a tree
        # would only add noise under the real problem.
        return schema_issues
    issues = [*schema_issues, *_structural_issues(document), *_security_issues(document)]
    return issues + _language_issues(document, issues) + _unknown_locale_issues(document, locales)


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


def _language_issues(document: dict[str, Any], base: list[DocumentIssue]) -> list[DocumentIssue]:
    """Each language, read as an article of its own, must still be a valid one.

    A translated heading over its length or a link mark with an unsafe address
    in translated text is refused like the same thing in the base language.
    """
    seen = {(issue.code, issue.node_id, issue.path) for issue in base}
    issues: list[DocumentIssue] = []
    for locale in document_locales(document)[1:]:
        view = localize(document, locale)
        if view is document:
            continue
        for issue in [*_schema_issues(view), *_security_issues(view)]:
            if (issue.code, issue.node_id, issue.path) in seen:
                continue
            issues.append(replace(issue, params={**issue.params, "locale": locale}))
    return issues


# ── reading ────────────────────────────────────────────────────

#: Plain-text fields, for the reading-time estimate. Rich text is found by its
#: shape (a list of runs with `text`), so it needs no list here.
_TEXT_KEYS = frozenset(
    {
        "title",
        "question",
        "term",
        "label",
        "caption",
        "cite",
        "code",
        "date",
        "value",
        "note",
        "name",
        "role",
        "description",
        "itemName",
        "prosTitle",
        "consTitle",
        "credit",
        "text",
    }
)


def plain_text(document: dict[str, Any]) -> str:
    """The words a reader reads — for the reading-time estimate."""
    parts: list[str] = []
    for node in (document.get("nodes") or {}).values():
        if node.get("hidden"):
            continue
        for _, key, value in _walk(node.get("props") or {}):
            if isinstance(value, str) and key in _TEXT_KEYS:
                parts.append(value)
            elif key in {"pros", "cons"} and isinstance(value, list):
                parts.extend(str(line) for line in value if isinstance(line, str))
    return "\n".join(part for part in parts if part.strip())


def reading_minutes_of(document: dict[str, Any], words_per_minute: int = 200) -> int:
    words = len(plain_text(document).split())
    return max(1, -(-words // words_per_minute))


# ── the legacy body ────────────────────────────────────────────


def _new_id() -> str:
    """A node id in the core package's format: a letter, then nine more."""
    return "n" + uuid_module.uuid4().hex[:9]


def _runs(text: str) -> list[dict[str, str]]:
    return [{"text": text}] if text else []


#: The standard element defaults these conversions need, as `defaults()` in
#: ``article/src/core/elements`` returns them. The contract test checks every
#: converted document against the schema, so a drifted default fails loudly.
_DEFAULTS: dict[str, dict[str, Any]] = {
    "paragraph": {"text": [], "dropCap": False, "lead": False},
    "heading": {"level": 2, "text": []},
    "list": {"style": "bullet", "items": []},
    "quote": {"text": [], "cite": "", "source": ""},
    "image": {
        "media": None,
        "pendingUrl": None,
        "alt": "",
        "caption": [],
        "credit": "",
        "aspect": "original",
        "focalX": 50,
        "focalY": 50,
        "size": "prose",
        "rounded": True,
        "lightbox": True,
        "link": None,
    },
}


def document_from_legacy(
    body: list[dict[str, Any]],
    *,
    title: str,
    excerpt: str | None = None,
    cover_key: str | None = None,
    cover_alt: str | None = None,
) -> dict[str, Any]:
    """`fromLegacyBody` in ``packages/builder-presets/src/legacy.ts``: the five legacy
    block kinds, mapped one to one onto their builder elements."""
    nodes: dict[str, Any] = {}
    order: list[str] = []

    def add(element: str, props: dict[str, Any]) -> None:
        node_id = _new_id()
        nodes[node_id] = {
            "id": node_id,
            "type": element,
            "v": 1,
            "props": {**_DEFAULTS[element], **props},
        }
        order.append(node_id)

    for block in body:
        kind = block.get("kind")
        if kind == "paragraph":
            add("paragraph", {"text": _runs(str(block.get("text", "")))})
        elif kind == "heading":
            add("heading", {"level": 2, "text": _runs(str(block.get("text", "")))})
        elif kind == "list":
            items = [str(item) for item in block.get("items", []) if str(item).strip()]
            add("list", {"items": [{"text": _runs(item)} for item in items]})
        elif kind == "quote":
            add("quote", {"text": _runs(str(block.get("text", "")))})
        elif kind == "image" and block.get("key"):
            add(
                "image",
                {
                    "media": {"key": str(block["key"])},
                    "alt": str(block.get("alt") or ""),
                    "caption": _runs(str(block.get("caption") or "")),
                },
            )

    nodes["root"] = {"id": "root", "type": "root", "v": 1, "props": {}, "children": order}
    meta: dict[str, Any] = {"title": title}
    if excerpt:
        meta["excerpt"] = excerpt
    if cover_key:
        meta["cover"] = {"media": {"key": cover_key}, "alt": cover_alt or ""}
    return {
        "schema": "builder/document",
        "version": 1,
        "root": "root",
        "nodes": nodes,
        "meta": meta,
    }


__all__ = [
    "ARTICLE_FOLDERS",
    "DRAFT_TOLERATES",
    "DocumentIssue",
    "check_document",
    "detect_embed_provider",
    "document_from_legacy",
    "is_safe_url",
    "limits",
    "media_keys",
    "plain_text",
    "reading_minutes_of",
]
