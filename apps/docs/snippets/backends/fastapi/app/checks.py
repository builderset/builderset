"""Checking a document before it is stored, for all three builders, with the
same issue codes as the editor."""

from collections.abc import Callable
from enum import StrEnum
from typing import Any

from builderset.article import DRAFT_TOLERATES as ARTICLE_DRAFT_TOLERATES
from builderset.article import check_article
from builderset.email import DRAFT_TOLERATES as EMAIL_DRAFT_TOLERATES
from builderset.email import DocumentIssue, EmailTypeSpec, check_email
from builderset.form import check_form, is_draft_blocking, is_publish_blocking

from app.errors import InvalidDocumentError
from app.models import Kit

#: The languages the project writes in: a document in another is refused.
LOCALES = ("en", "sq")
#: Your email types, by key: the variables a template for each may use.
EMAIL_TYPES: dict[str, EmailTypeSpec] = {}


class Level(StrEnum):
    #: May be unfinished, never unsafe.
    DRAFT = "draft"
    #: Every error blocks it.
    PUBLISH = "publish"


def _every(_issue: DocumentIssue) -> bool:
    return True


# What blocks a document at each level. Each kit names what a draft may still
# carry: the same lists the editor uses.
_BLOCKS: dict[tuple[Kit, Level], Callable[[DocumentIssue], bool]] = {
    (Kit.EMAIL, Level.DRAFT): lambda issue: issue.code not in EMAIL_DRAFT_TOLERATES,
    (Kit.EMAIL, Level.PUBLISH): _every,
    (Kit.ARTICLE, Level.DRAFT): lambda issue: issue.code not in ARTICLE_DRAFT_TOLERATES,
    (Kit.ARTICLE, Level.PUBLISH): _every,
    (Kit.FORM, Level.DRAFT): is_draft_blocking,
    (Kit.FORM, Level.PUBLISH): is_publish_blocking,
}


def _issues(kit: Kit, document: Any, type_key: str | None) -> list[DocumentIssue]:
    if kit == Kit.EMAIL:
        spec = EMAIL_TYPES.get(type_key) if type_key else None
        return check_email(document, spec, locales=LOCALES)
    if kit == Kit.ARTICLE:
        return check_article(document, locales=LOCALES)
    return check_form(document, locales=LOCALES)


def checked(
    kit: Kit, document: Any, level: Level, *, type_key: str | None = None
) -> dict[str, Any]:
    """The document from a request, or ``InvalidDocumentError`` with what blocks it."""
    issues = _issues(kit, document, type_key)
    blocking = [issue.as_dict() for issue in issues if _BLOCKS[kit, level](issue)]
    # A live form needs its address; a draft may not have one yet.
    if not blocking and kit == Kit.FORM and level == Level.PUBLISH and not document["meta"]["slug"]:
        blocking.append({"code": "meta.slugMissing", "path": "meta.slug"})
    if blocking:
        raise InvalidDocumentError(blocking)
    # The checks refuse anything that is not a JSON object.
    return dict(document)
