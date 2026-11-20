"""The popup's JSON Schema, and what its ``x-`` sections say.

``@builderset/popup`` writes ``packages/popup/schema/popup.schema.json`` from its
own element schemas; the build copies it into this package as ``schema.json``.
Everything a check needs that JSON Schema cannot express is read from the same
file: which element may hold which (``x-elements``), the tree's ceilings
(``x-limits``), what each type of popup is (``x-popup-types``), the default
variables (``x-variables``).
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from functools import cache, lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, ValidationError, validators

from builderset.form import _js

SCHEMA_PATH = Path(__file__).with_name("schema.json")


@cache
def schema() -> dict[str, Any]:
    """The whole JSON Schema, as written by ``toPopupJSONSchema``."""
    loaded: dict[str, Any] = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    return loaded


@lru_cache(maxsize=64)
def _js_regex(source: str) -> re.Pattern[str]:
    """A schema pattern (a JavaScript source, no flags) with JavaScript's meaning.

    ``$`` is the end of the string (Python's also matches before a final
    newline), and ``\\d`` / ``\\w`` are ASCII.
    """
    translated: list[str] = []
    escaped = in_class = False
    for char in source:
        if escaped:
            translated.append(char)
            escaped = False
        elif char == "\\":
            translated.append(char)
            escaped = True
        elif char == "[":
            in_class = True
            translated.append(char)
        elif char == "]":
            in_class = False
            translated.append(char)
        elif char == "$" and not in_class:
            translated.append(r"\Z")
        else:
            translated.append(char)
    return re.compile("".join(translated), re.ASCII)


def _pattern(
    validator: Any, pattern: str, instance: Any, _schema: dict[str, Any]
) -> Iterator[ValidationError]:
    if validator.is_type(instance, "string") and not _js_regex(pattern).search(_js.utf16(instance)):
        yield ValidationError(f"{instance!r} does not match {pattern!r}")


#: Draft 2020-12 with the ``pattern`` keyword read as JavaScript reads it.
PopupValidator = validators.extend(Draft202012Validator, {"pattern": _pattern})


@cache
def validator() -> Any:
    return PopupValidator(schema())


def elements() -> dict[str, dict[str, Any]]:
    """``x-elements``: per element type, its ``container`` rule and ``parents``."""
    found: dict[str, dict[str, Any]] = schema()["x-elements"]
    return found


def limits() -> dict[str, int]:
    """``x-limits``: the most nodes, the deepest nesting and the most bytes a popup may have."""
    found: dict[str, int] = schema()["x-limits"]
    return found


def popup_types() -> dict[str, dict[str, Any]]:
    """``x-popup-types``: per type, the sides it stretches, its overlay, whether it is modal."""
    found: dict[str, dict[str, Any]] = schema()["x-popup-types"]
    return found


def default_variables() -> tuple[str, ...]:
    """``x-variables``: the variable paths a popup has when the project names none."""
    return tuple(schema()["x-variables"])


@cache
def _node_schemas() -> dict[str, dict[str, Any]]:
    """Each element's node schema, by type: the branches of the node union."""
    reference = schema()["properties"]["nodes"]["$ref"]
    nodes = schema()["$defs"][reference.rsplit("/", 1)[-1]]
    variants = nodes["additionalProperties"]["oneOf"]
    return {variant["properties"]["type"]["const"]: variant for variant in variants}


def node_errors(element_type: str, node: Any) -> list[ValidationError]:
    """Why ``node`` is not a valid node of this element (empty when it is).

    The schema's node union says only that a node matches none of its
    branches; this says what is wrong with it, field by field.
    """
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
    "PopupValidator",
    "default_variables",
    "elements",
    "limits",
    "node_errors",
    "popup_types",
    "props_errors",
    "schema",
    "validator",
]
