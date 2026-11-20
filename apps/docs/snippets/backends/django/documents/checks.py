"""The one place a document is checked before it is stored, for every
builder, with the same issue codes as the editor."""

from collections.abc import Callable
from typing import Any, Literal

from builderset import card, form, popup
from builderset.article import DRAFT_TOLERATES as ARTICLE_DRAFT_TOLERATES
from builderset.article import check_article
from builderset.email import DRAFT_TOLERATES as EMAIL_DRAFT_TOLERATES
from builderset.email import DocumentIssue, EmailTypeSpec, check_email

from .errors import Refused
from .models import Kit

Level = Literal["draft", "publish"]

#: The languages the project writes in: a document in another is refused.
LOCALES = ["en", "sq"]
#: Your email types, by key: the variables a template for each may use.
EMAIL_TYPES: dict[str, EmailTypeSpec] = {}
#: Your members' fields a card may print, as {"path": "member.name", "kind": "text"}.
#: None: the card kit's own.
CARD_FIELDS: list[card.CardField] | None = None


def _every(_issue: DocumentIssue) -> bool:
    return True


# A draft may be unfinished but never unsafe; publishing refuses every error.
# Each kit names what a draft may still carry: the same lists the editor uses.
_BLOCKS: dict[tuple[Kit, Level], Callable[[DocumentIssue], bool]] = {
    (Kit.EMAIL, "draft"): lambda issue: issue.code not in EMAIL_DRAFT_TOLERATES,
    (Kit.EMAIL, "publish"): _every,
    (Kit.ARTICLE, "draft"): lambda issue: issue.code not in ARTICLE_DRAFT_TOLERATES,
    (Kit.ARTICLE, "publish"): _every,
    (Kit.FORM, "draft"): form.is_draft_blocking,
    (Kit.FORM, "publish"): form.is_publish_blocking,
    (Kit.CARD, "draft"): card.is_draft_blocking,
    # Publishing a card design approves it for print.
    (Kit.CARD, "publish"): card.is_print_blocking,
    (Kit.POPUP, "draft"): popup.is_draft_blocking,
    (Kit.POPUP, "publish"): popup.is_publish_blocking,
}


def _issues(kit: Kit, document: Any, type_key: str | None) -> list[DocumentIssue]:
    if kit == Kit.EMAIL:
        spec = EMAIL_TYPES.get(type_key) if type_key else None
        return check_email(document, spec, locales=LOCALES)
    if kit == Kit.ARTICLE:
        return check_article(document, locales=LOCALES)
    if kit == Kit.CARD:
        return card.check_card(document, fields=CARD_FIELDS, locales=LOCALES)
    if kit == Kit.POPUP:
        return popup.check_popup(document, locales=LOCALES)
    return form.check_form(document, locales=LOCALES)


def check_document(kit: Kit, document: Any, level: Level, *, type_key: str | None = None) -> None:
    """Raise ``Refused`` with what stops this write, as the editor reads it."""
    blocks = _BLOCKS[kit, level]
    blocking = [issue.as_dict() for issue in _issues(kit, document, type_key) if blocks(issue)]
    # A live form needs its address; a draft may not have one yet.
    if not blocking and kit == Kit.FORM and level == "publish" and not document["meta"]["slug"]:
        blocking.append({"code": "meta.slugMissing", "path": "meta.slug"})
    if blocking:
        raise Refused(issues=blocking)
