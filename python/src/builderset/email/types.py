"""Email TYPES: the event that sends an email, and the variables it provides.

An email type is "password reset", "application approved", "newsletter". Each
declares the variables the sending code puts in the template's context, which
of them a template must use (a reset email without the reset link is not a
reset email), and samples for the editor's preview. The list of types is the
application's own; this module holds their shape — the same as ``EmailTypeSpec``
in ``@builderset/email`` — and the variables every type has.
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class VariableSpec(TypedDict, total=False):
    name: str
    label: dict[str, str]
    type: str
    required: bool
    example: Any
    fields: list[VariableSpec]
    children: list[VariableSpec]


class EmailTypeSpec(TypedDict, total=False):
    key: str
    label: dict[str, str]
    description: dict[str, str]
    category: str
    kind: Literal["transactional", "marketing"]
    variables: list[VariableSpec]
    mustUse: list[str]
    samples: dict[str, dict[str, Any]]


#: The system variables every template may use — ``SYSTEM_VARIABLES`` in
#: ``@builderset/email``. The sending code provides them on every email.
SYSTEM_PATHS = frozenset(
    {
        "recipient.name",
        "recipient.email",
        "brand.name",
        "brand.website",
        "brand.address",
        "links.unsubscribe",
        "links.preferences",
        "links.view_in_browser",
        "current_year",
        "now",
    }
)


def _flatten(specs: list[VariableSpec], prefix: str = "") -> set[str]:
    paths: set[str] = set()
    for spec in specs:
        path = f"{prefix}.{spec['name']}" if prefix else spec["name"]
        children = spec.get("children")
        if children:
            paths |= _flatten(children, path)
            continue
        paths.add(path)
        for field in spec.get("fields") or []:
            paths.add(f"item.{field['name']}")
    return paths


def variable_paths(spec: EmailTypeSpec) -> set[str]:
    """Every path a template of this type may reference."""
    return set(SYSTEM_PATHS) | _flatten(spec.get("variables") or [])


__all__ = ["SYSTEM_PATHS", "EmailTypeSpec", "VariableSpec", "variable_paths"]
