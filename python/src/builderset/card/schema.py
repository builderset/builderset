"""The card's JSON Schema, and what its ``x-`` sections say.

``@builderset/card`` writes ``packages/card/schema/card.schema.json`` from its
own element schemas; the build copies it into this package as ``schema.json``.
Everything a check needs that JSON Schema cannot express is read from the same
file: which element may hold which (``x-elements``), the tree's ceilings
(``x-limits``), each format's size and whether it is printed (``x-formats``),
the member fields a card may use by default (``x-fields``), and the checks'
numbers and lists (``x-rules``).
"""

from __future__ import annotations

import json
import re
from functools import cache
from pathlib import Path
from typing import Any

from jsonschema import ValidationError

from builderset.form import _js
from builderset.form.schema import FormValidator

SCHEMA_PATH = Path(__file__).with_name("schema.json")

#: Draft 2020-12 with ``pattern`` read as JavaScript reads it — the form's, as is.
CardValidator = FormValidator


@cache
def schema() -> dict[str, Any]:
    """The whole JSON Schema, as written by ``toCardJSONSchema``."""
    loaded: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return loaded


@cache
def validator() -> Any:
    return CardValidator(schema())


def elements() -> dict[str, dict[str, Any]]:
    """``x-elements``: per element type, its ``container`` rule and ``parents``."""
    found: dict[str, dict[str, Any]] = schema()["x-elements"]
    return found


def limits() -> dict[str, int]:
    """``x-limits``: the most nodes, the deepest nesting and the most bytes a card may have."""
    found: dict[str, int] = schema()["x-limits"]
    return found


def formats() -> dict[str, dict[str, Any]]:
    """``x-formats``: per format, its width, height, radius and whether it is printed."""
    found: dict[str, dict[str, Any]] = schema()["x-formats"]
    return found


def default_fields() -> list[dict[str, str]]:
    """``x-fields``: the member fields (``path``, ``kind``) a card uses when the host names none."""
    found: list[dict[str, str]] = schema()["x-fields"]
    return found


def rules() -> dict[str, Any]:
    """``x-rules``: the smallest type and QR code, which elements are words, the schemes…"""
    found: dict[str, Any] = schema()["x-rules"]
    return found


@cache
def variable_pattern() -> re.Pattern[str]:
    r"""``{{ path }}`` as ``VARIABLE_TOKEN`` in TypeScript, with JavaScript's ``\s``."""
    source: str = rules()["variable"]
    return re.compile(source.replace(r"\s", f"[{_js.WS}]"))


@cache
def _node_schemas() -> dict[str, dict[str, Any]]:
    """Each element's node schema, by type: the branches of the node union."""
    reference = schema()["properties"]["nodes"]["$ref"]
    nodes = schema()["$defs"][reference.rsplit("/", 1)[-1]]
    variants = nodes["additionalProperties"]["oneOf"]
    return {variant["properties"]["type"]["const"]: variant for variant in variants}


def node_errors(element_type: str, node: Any) -> list[ValidationError]:
    """Why ``node`` is not a valid node of this element (empty when it is)."""
    node_schema = _node_schemas().get(element_type)
    if node_schema is None:
        return []
    return list(validator().evolve(schema=node_schema).iter_errors(node))


def props_errors(element_type: str, props: Any) -> list[ValidationError]:
    """Why ``props`` are not valid props for this element (empty when they are)."""
    node_schema = _node_schemas().get(element_type)
    if node_schema is None:
        return []
    props_schema = node_schema["properties"]["props"]
    return list(validator().evolve(schema=props_schema).iter_errors(props))


__all__ = [
    "SCHEMA_PATH",
    "CardValidator",
    "default_fields",
    "elements",
    "formats",
    "limits",
    "node_errors",
    "props_errors",
    "rules",
    "schema",
    "validator",
    "variable_pattern",
]
