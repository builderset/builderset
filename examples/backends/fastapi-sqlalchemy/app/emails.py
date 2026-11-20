"""Checking a document before it is stored, with the same codes as the editor."""

from typing import Any, Literal

from builderset.email import DRAFT_TOLERATES, check_email


class InvalidDocumentError(Exception):
    """A document the server will not store; answered with 422 and its issues."""

    def __init__(self, issues: list[dict[str, Any]]) -> None:
        super().__init__("The document was refused.")
        self.issues = issues


def checked(document: Any, level: Literal["draft", "publish"]) -> dict[str, Any]:
    """The document from a request, or ``InvalidDocumentError``.

    A draft may be unfinished (no subject yet) but never unsafe; publishing
    refuses every issue. ``DRAFT_TOLERATES`` is the same list the editor uses.
    """
    issues = check_email(document)
    if level == "draft":
        issues = [issue for issue in issues if issue.code not in DRAFT_TOLERATES]
    if issues:
        raise InvalidDocumentError([issue.as_dict() for issue in issues])
    # check_email refuses anything that is not a JSON object.
    return dict(document)
