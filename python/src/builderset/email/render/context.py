"""``context.ts``: what rendering needs besides the document.

The brand kit ``brand.*`` colours resolve to, the data variables are filled
with, where media keys live, and the reader's language. Function names follow
the TS file so the two can be read side by side.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import cache
from pathlib import Path
from typing import Any

from app.domains.email_builder.render.formats import format_value
from app.domains.email_builder.render.js import (
    UNDEFINED,
    primitive_text,
    to_number,
    to_string,
)

#: ``@builderset/email``'s ``fixtures/render_data.json``, copied by
#: ``scripts/sync-builder-contract.mjs`` like the JSON Schema: the font stacks
#: and row layouts are data in TS and must not be re-typed here.
RENDER_DATA = Path(__file__).resolve().parent / "render_data.json"

DEFAULT_BRAND: dict[str, Any] = {
    "name": "Your company",
    "website": "https://example.com",
    "address": "Street 1, City",
    "logo": None,
    "logoDark": None,
    "colors": {
        "primary": "#111827",
        "secondary": "#374151",
        "accent": "#2563eb",
        "text": "#1f2937",
        "muted": "#6b7280",
        "background": "#f4f4f5",
        "surface": "#ffffff",
        "border": "#e5e7eb",
    },
    "font": "system",
    "social": [],
}

#: ``{{ path }}`` or ``{{ path | format }}`` — ``TEMPLATE_TOKEN`` in @builderset/email.
TEMPLATE_TOKEN = re.compile(r"\{\{\s*([a-z_][a-z0-9_.]*)\s*(?:\|\s*([a-z_]+)\s*)?\}\}")


def social_icon_url(base: str) -> Callable[[str, str], str]:
    """``socialIconUrl`` in ``context.ts``: ``<site>/email/social/<network>-<style>.png``."""
    root = base.rstrip("/")
    return lambda network, style: f"{root}/email/social/{network}-{style}.png"


@cache
def render_data() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(RENDER_DATA.read_text(encoding="utf-8"))
    return data


@dataclass
class RenderContext:
    doc: dict[str, Any]
    brand: dict[str, Any]
    data: dict[str, Any]
    asset_url: Callable[[str], str]
    locale: str
    currency: str
    #: A network and style → icon URL, for the social block's icons.
    social_icon: Callable[[str, str], str] | None = None
    #: Variables used with no value and no fallback — logged as warnings.
    missing: set[str] = field(default_factory=set)

    @property
    def settings(self) -> dict[str, Any]:
        settings: dict[str, Any] = self.doc["settings"]
        return settings

    def node(self, node_id: str) -> dict[str, Any] | None:
        node: dict[str, Any] | None = self.doc["nodes"].get(node_id)
        return node


def iso_now(now: datetime) -> str:
    """``new Date().toISOString()`` — milliseconds and a ``Z``."""
    return now.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def create_context(
    doc: dict[str, Any],
    *,
    asset_url: Callable[[str], str],
    brand: dict[str, Any] | None = None,
    data: dict[str, Any] | None = None,
    locale: str | None = None,
    currency: str | None = None,
    now: datetime | None = None,
    social_icon: Callable[[str, str], str] | None = None,
) -> RenderContext:
    kit = brand or DEFAULT_BRAND
    moment = now or datetime.now(UTC)
    return RenderContext(
        doc=doc,
        brand=kit,
        data={
            "now": iso_now(moment),
            "current_year": moment.year,
            "brand": {
                "name": kit.get("name"),
                "website": kit.get("website"),
                "address": kit.get("address"),
            },
            **(data or {}),
        },
        asset_url=asset_url,
        locale=locale or "en",
        currency=currency or "EUR",
        social_icon=social_icon,
    )


def color(value: Any, context: RenderContext) -> str | None:
    """A colour value — hex or ``brand.primary`` — as hex."""
    if not value:
        return None
    text = str(value)
    if text.startswith("brand."):
        key = text[len("brand.") :]
        colors = context.brand.get("colors") or {}
        found = colors.get(key)
        if found is None:
            found = DEFAULT_BRAND["colors"].get(key)
        return str(found) if found is not None else "#111827"
    return text


def typography(props: dict[str, Any]) -> dict[str, str | None]:
    spacing = props.get("letterSpacing")
    transform = props.get("transform")
    weight = props.get("weight")
    letter_spacing = None
    if isinstance(spacing, int | float) and not isinstance(spacing, bool) and spacing != 0:
        letter_spacing = f"{to_string(spacing)}px"
    return {
        "fontWeight": weight if isinstance(weight, str) else None,
        "letterSpacing": letter_spacing,
        "textTransform": transform if isinstance(transform, str) and transform != "none" else None,
    }


def fonts_in_use(doc: dict[str, Any]) -> list[str]:
    """Every font the document uses — the email's and each block's own, in order."""
    keys: dict[str, None] = {doc["settings"]["font"]: None}

    def scan(value: Any) -> None:
        if isinstance(value, list):
            for item in value:
                scan(item)
        elif isinstance(value, dict):
            if value.get("type") == "font" and isinstance(value.get("family"), str):
                keys[value["family"]] = None
            for item in value.values():
                scan(item)

    for node in doc["nodes"].values():
        props = node.get("props") or {}
        if isinstance(props.get("font"), str):
            keys[props["font"]] = None
        scan(props)
    return list(keys)


def font_stack(font: Any, context: RenderContext) -> str:
    key = font if font is not None and font is not UNDEFINED else context.settings["font"]
    fonts: dict[str, dict[str, Any]] = render_data()["fonts"]
    entry = fonts.get(key) if isinstance(key, str) else None
    return str((entry or fonts["system"])["stack"])


def google_fonts_url(keys: list[str]) -> str | None:
    fonts: dict[str, dict[str, Any]] = render_data()["fonts"]
    families = sorted(
        str(fonts[key]["google"])
        for key in dict.fromkeys(keys)
        if key and key in fonts and fonts[key].get("google")
    )
    if not families:
        return None
    joined = "&".join(f"family={family}" for family in families)
    return f"https://fonts.googleapis.com/css2?{joined}&display=swap"


# ── values ───────────────────────────────────────────────────────────────────


def lookup(data: Any, path: str) -> Any:
    """A value at a dotted path — ``undefined`` when any step is missing."""
    current: Any = data
    for part in path.split("."):
        if isinstance(current, list):
            current = len(current) if part == "length" else UNDEFINED
            continue
        if not isinstance(current, dict):
            return UNDEFINED
        current = current.get(part, UNDEFINED)
    return current


def _merged(context: RenderContext, scope: dict[str, Any]) -> dict[str, Any]:
    return {**context.data, **scope} if scope else context.data


def variable_text(
    path: str,
    format_: str | None,
    fallback: str | None,
    context: RenderContext,
    scope: dict[str, Any] | None = None,
) -> str:
    """One variable's text, or its fallback."""
    value = lookup(_merged(context, scope or {}), path)
    text = format_value(value, format_, context.locale, context.currency)
    if text:
        return text
    if fallback:
        return fallback
    context.missing.add(path)
    return ""


def fill(template: str, context: RenderContext, scope: dict[str, Any] | None = None) -> str:
    """A template string with every ``{{ … }}`` filled in. NOT escaped."""
    return TEMPLATE_TOKEN.sub(
        lambda match: variable_text(match.group(1), match.group(2), None, context, scope),
        template,
    )


# ── conditions ───────────────────────────────────────────────────────────────


def holds(
    conditions: list[dict[str, Any]],
    context: RenderContext,
    scope: dict[str, Any] | None = None,
) -> bool:
    merged = _merged(context, scope or {})
    for condition in conditions:
        value = lookup(merged, str(condition.get("var", "")))
        text = primitive_text(value)
        expected = condition.get("value")
        expected_text = "" if expected is None else str(expected)
        op = condition.get("op")
        if op == "exists":
            ok = text != "" and value is not False
        elif op == "missing":
            ok = text == "" or value is False
        elif op == "eq":
            ok = text == expected_text
        elif op == "neq":
            ok = text != expected_text
        elif op == "gt":
            ok = to_number(value) > to_number(UNDEFINED if expected is None else expected)
        elif op == "lt":
            ok = to_number(value) < to_number(UNDEFINED if expected is None else expected)
        elif op == "contains":
            ok = expected_text.lower() in text.lower()
        else:
            ok = False
        if not ok:
            return False
    return True


def list_of(path: str, context: RenderContext, scope: dict[str, Any] | None = None) -> list[Any]:
    value = lookup(_merged(context, scope or {}), path)
    return value if isinstance(value, list) else []


__all__ = [
    "DEFAULT_BRAND",
    "TEMPLATE_TOKEN",
    "RenderContext",
    "color",
    "create_context",
    "fill",
    "font_stack",
    "fonts_in_use",
    "google_fonts_url",
    "holds",
    "list_of",
    "lookup",
    "render_data",
    "typography",
    "variable_text",
]
