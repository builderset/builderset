"""Checking a document before it is stored, for all three builders, with the
same issue codes as the editor."""

from collections.abc import Callable
from typing import Any, Literal

from builderset.article import DRAFT_TOLERATES as ARTICLE_DRAFT_TOLERATES
from builderset.article import check_article
from builderset.email import DRAFT_TOLERATES as EMAIL_DRAFT_TOLERATES
from builderset.email import DocumentIssue, EmailTypeSpec, check_email
from builderset.form import check_form, is_draft_blocking, is_publish_blocking

Kit = Literal["email", "article", "form"]
Level = Literal["draft", "publish"]

#: The languages the project writes in: a document in another is refused.
LOCALES = ["en", "sq"]
#: Your email types, by key: the variables a template for each may use.
EMAIL_TYPES: dict[str, EmailTypeSpec] = {}


class InvalidDocumentError(Exception):
    """A document the server will not store; answered with 422 and its issues."""

    def __init__(self, issues: list[dict[str, Any]]) -> None:
        super().__init__("The document was refused.")
        self.issues = issues


def _every(_issue: DocumentIssue) -> bool:
    return True


# A draft may be unfinished but never unsafe; publishing refuses every error.
# Each kit names what a draft may still carry: the same lists the editor uses.
_BLOCKS: dict[tuple[Kit, Level], Callable[[DocumentIssue], bool]] = {
    ("email", "draft"): lambda issue: issue.code not in EMAIL_DRAFT_TOLERATES,
    ("email", "publish"): _every,
    ("article", "draft"): lambda issue: issue.code not in ARTICLE_DRAFT_TOLERATES,
    ("article", "publish"): _every,
    ("form", "draft"): is_draft_blocking,
    ("form", "publish"): is_publish_blocking,
}


def checked(
    kit: Kit, document: Any, level: Level, *, type_key: str | None = None
) -> dict[str, Any]:
    """The document from a request, or ``InvalidDocumentError`` with what blocks it."""
    if kit == "email":
        spec = EMAIL_TYPES.get(type_key) if type_key else None
        issues = check_email(document, spec, locales=LOCALES)
    elif kit == "article":
        issues = check_article(document, locales=LOCALES)
    else:
        issues = check_form(document, locales=LOCALES)
    blocking = [issue.as_dict() for issue in issues if _BLOCKS[kit, level](issue)]
    # A live form needs its address; a draft may not have one yet.
    if not blocking and kit == "form" and level == "publish" and not document["meta"]["slug"]:
        blocking.append({"code": "meta.slugMissing", "path": "meta.slug"})
    if blocking:
        raise InvalidDocumentError(blocking)
    # The checks refuse anything that is not a JSON object.
    return dict(document)
