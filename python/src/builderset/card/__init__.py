"""Cards: ``check_card`` for a card design, ``fill_card`` for one member's copy of it.

``check_card`` checks a card document the way ``checkCard`` in
``@builderset/card`` does, with the same codes: the tree, then the print rules
on each printed side — words and codes inside the safe area, type of 6 pt or
more, QR codes of 15 mm or more, a chip on a bank card, safe links, variables
the member fields have. ``fields_used`` and ``fill_card`` are a backend's tools
for issuing cards with the member's data frozen. There is no card renderer
here: the renderer is React (``@builderset/card/render``).
"""

from builderset.card.document import (
    DRAFT_TOLERATES,
    WARNINGS,
    CardField,
    check_card,
    is_draft_blocking,
    is_print_blocking,
    is_warning,
    media_keys,
)
from builderset.card.fill import fields_used, fill_card, fill_text
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule

__all__ = [
    "DRAFT_TOLERATES",
    "WARNINGS",
    "CardField",
    "DocumentIssue",
    "MediaKeyRule",
    "check_card",
    "fields_used",
    "fill_card",
    "fill_text",
    "is_draft_blocking",
    "is_print_blocking",
    "is_warning",
    "media_keys",
]
