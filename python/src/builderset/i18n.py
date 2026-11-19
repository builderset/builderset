"""One document, every language — ``engine/src/core/i18n.ts`` in Python.

An article or an email template is written once; when its writer turns
multi-language on, the words for each other language are kept beside the tree
in ``document["i18n"]``::

    {"enabled": true, "base": "sq",
     "translations": {"en": {"meta": {"subject": "…"},
                             "nodes": {"<node id>": {"text": [...], "items.0.label": "…"}}}}}

:func:`localize` lays one language over the base and returns an ordinary
document — what the email renderer and the public blog read. Whatever is not
translated reads in the base language. The rules are the TS ones exactly; the
email golden fixtures hold the two together.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from typing import Any

#: A BCP 47 tag, as far as we need it: ``en``, ``sq``, ``pt-BR``, ``zh-Hant``. Which
#: languages a project allows is the project's choice, passed in by the callers
#: (the ``locales`` argument of the checks) — not a list here.
LOCALE_CODE = re.compile(r"^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,2}$")

#: Meta fields that are words; everything else in meta is shared.
TRANSLATABLE_META = frozenset(
    {"title", "excerpt", "seo.title", "seo.description", "cover.alt", "subject", "preheader"}
)


class _Missing:
    """A step that is not there — distinct from a JSON ``null``."""


MISSING = _Missing()


def has_words(value: Any) -> bool:
    """A translation counts only when it says something; an empty one falls back."""
    if isinstance(value, str):
        return value.strip() != ""
    if isinstance(value, list):
        return any(
            isinstance(run, dict) and isinstance(run.get("text"), str) and run["text"].strip()
            for run in value
        )
    return False


def value_at(value: Any, path: str) -> Any:
    """The leaf at a dot path, or :data:`MISSING`."""
    current = value
    for part in path.split("."):
        if isinstance(current, list):
            if not (part.isascii() and part.isdigit()) or int(part) >= len(current):
                return MISSING
            current = current[int(part)]
        elif isinstance(current, dict):
            if part not in current:
                return MISSING
            current = current[part]
        else:
            return MISSING
    return current


def with_value_at(value: Any, path: str, leaf: Any) -> Any:
    """A copy of ``value`` with the leaf at ``path`` replaced, copying only the way down."""
    head, _, rest = path.partition(".")

    def nxt(current: Any) -> Any:
        return with_value_at(current, rest, leaf) if rest else leaf

    if isinstance(value, list):
        items = list(value)
        items[int(head)] = nxt(items[int(head)])
        return items
    record = dict(value) if isinstance(value, dict) else {}
    record[head] = nxt(record.get(head))
    return record


def _same_kind(current: Any, value: Any) -> bool:
    return (isinstance(current, str) and isinstance(value, str)) or (
        isinstance(current, list) and isinstance(value, list)
    )


def is_translating(document: dict[str, Any] | None, locale: str | None) -> bool:
    """Whether ``locale`` is a translation (not the base) of this multi-language document."""
    i18n = document.get("i18n") if isinstance(document, dict) else None
    return bool(
        isinstance(i18n, dict)
        and i18n.get("enabled") is True
        and isinstance(locale, str)
        and LOCALE_CODE.match(locale)
        and locale != i18n.get("base")
    )


def document_locales(document: dict[str, Any], locales: Sequence[str] | None = None) -> list[str]:
    """The base language first, then the others when multi-language is on.

    ``locales`` is the project's list, in its order; without one, the
    languages the document already holds words in.
    """
    i18n = document.get("i18n")
    if not isinstance(i18n, dict):
        return []
    base = str(i18n.get("base") or "")
    if i18n.get("enabled") is not True:
        return [base]
    others = locales if locales is not None else list((i18n.get("translations") or {}).keys())
    return [base, *(locale for locale in others if locale != base)]


def unknown_locales(document: dict[str, Any], locales: Sequence[str]) -> list[str]:
    """The languages a document holds — its base and its translations — outside ``locales``."""
    i18n = document.get("i18n")
    if not isinstance(i18n, dict):
        return []
    held = [str(i18n.get("base") or ""), *(i18n.get("translations") or {}).keys()]
    return [locale for locale in dict.fromkeys(held) if locale not in locales]


def translated_locales(document: dict[str, Any], locales: Sequence[str] | None = None) -> list[str]:
    """The languages a multi-language document has a translated title or subject in."""
    if not isinstance(document.get("i18n"), dict) or document["i18n"].get("enabled") is not True:
        return []
    translations = document["i18n"].get("translations") or {}
    return [
        locale
        for locale in document_locales(document, locales)[1:]
        if has_words(((translations.get(locale) or {}).get("meta") or {}).get("title"))
        or has_words(((translations.get(locale) or {}).get("meta") or {}).get("subject"))
    ]


def _meta_slot_free(meta: dict[str, Any], path: str) -> bool:
    head, _, tail = path.partition(".")
    if not tail:
        return True
    if head != "seo":
        return False
    seo = meta.get("seo", MISSING)
    return seo is MISSING or isinstance(seo, dict)


def localize(document: dict[str, Any], locale: str | None) -> dict[str, Any]:
    """The document as it reads in ``locale`` — the same object when nothing changes."""
    if not is_translating(document, locale):
        return document
    translation = ((document["i18n"].get("translations") or {}).get(locale)) or None
    if not isinstance(translation, dict):
        return document

    source_nodes = document.get("nodes") or {}
    nodes: dict[str, Any] | None = None
    for node_id, fields in (translation.get("nodes") or {}).items():
        node = source_nodes.get(node_id)
        if not isinstance(node, dict) or not isinstance(fields, dict):
            continue
        props = node.get("props") or {}
        original = props
        for path, value in fields.items():
            if not has_words(value):
                continue
            current = value_at(props, path)
            if current is MISSING or not _same_kind(current, value):
                continue
            props = with_value_at(props, path, value)
        if props is not original:
            if nodes is None:
                nodes = dict(source_nodes)
            nodes[node_id] = {**node, "props": props}

    meta = document.get("meta") or {}
    original_meta = meta
    for path, value in (translation.get("meta") or {}).items():
        if path not in TRANSLATABLE_META or not isinstance(value, str) or not has_words(value):
            continue
        current = value_at(meta, path)
        if current is MISSING:
            if not _meta_slot_free(meta, path):
                continue
        elif not isinstance(current, str):
            continue
        meta = with_value_at(meta, path, value)

    if nodes is None and meta is original_meta:
        return document
    return {**document, "nodes": nodes if nodes is not None else source_nodes, "meta": meta}


__all__ = [
    "LOCALE_CODE",
    "TRANSLATABLE_META",
    "document_locales",
    "has_words",
    "is_translating",
    "localize",
    "translated_locales",
    "unknown_locales",
]
