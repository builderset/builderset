"""A card and one member's data, together — ``fieldsUsed`` and ``fillCard`` in TypeScript.

A backend that issues a card to a member freezes the member's data at that
moment (``{"member.name": "Arben Hoxha", …}``); :func:`fill_card` writes it into
a copy of the design exactly as the renderer fills it on the page, and
:func:`fields_used` says which data a design needs before it is printed.
"""

from __future__ import annotations

import copy
import re
from collections.abc import Mapping
from typing import Any

from builderset.card.document import elements_of, printed_faces, variables_in
from builderset.card.schema import rules, variable_pattern


def fill_text(text: str, record: Mapping[str, str] | None) -> str:
    """`fillText`: each variable replaced by the record's value; one it lacks stays as written."""
    if record is None:
        return text

    def value(match: re.Match[str]) -> str:
        path = match.group(1)
        return str(record[path]) if path in record else match.group(0)

    return variable_pattern().sub(value, text)


def fields_used(document: dict[str, Any]) -> list[str]:
    """Every member field a design uses on its printed sides, in order of first use."""
    props_by_type: dict[str, str] = rules()["variableProps"]
    used: dict[str, None] = {}
    for face in printed_faces(document):
        for node in elements_of(document, face):
            if node.get("hidden"):
                continue
            props = node.get("props") or {}
            prop = props_by_type.get(str(node.get("type")))
            value = props.get(prop) if prop else None
            if isinstance(value, str):
                for path in variables_in(value):
                    used[path] = None
            if node.get("type") == "photo" and isinstance(props.get("bind"), str):
                used[props["bind"]] = None
    return list(used)


def fill_card(document: dict[str, Any], record: Mapping[str, str]) -> dict[str, Any]:
    """A copy of the card with one member's data written into its words and codes.

    Photos keep their field: the picture is the record's, by address, when the
    card is drawn.
    """
    props_by_type: dict[str, str] = rules()["variableProps"]
    filled = copy.deepcopy(document)
    for node in (filled.get("nodes") or {}).values():
        prop = props_by_type.get(str(node.get("type")))
        props = node.get("props") or {}
        if prop and isinstance(props.get(prop), str):
            props[prop] = fill_text(props[prop], record)
    return filled


__all__ = ["fields_used", "fill_card", "fill_text"]
