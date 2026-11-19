"""What a check reports: one reason a document cannot be stored."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class DocumentIssue:
    """One problem, in the same words as the TypeScript checker.

    ``code`` is the TypeScript code (``url.unsafe``, ``placement.notAllowed``),
    so an editor can show the server's refusal with its own messages.
    """

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


__all__ = ["DocumentIssue"]
