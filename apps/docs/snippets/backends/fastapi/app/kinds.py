"""What differs between emails, articles and forms, in one table. The routes
are written once and look their kind up here by the URL: /api/{kind}/…"""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated, Any, Literal

from fastapi import Depends

from app.models import (
    Article,
    ArticleRevision,
    EmailTemplate,
    EmailTemplateRevision,
    Form,
    FormRevision,
    Kit,
    Status,
)

DocumentRow = EmailTemplate | Article | Form
RevisionRow = EmailTemplateRevision | ArticleRevision | FormRevision


@dataclass(frozen=True)
class Kind:
    kit: Kit
    noun: str
    model: type[DocumentRow]
    revision: type[RevisionRow]
    #: Copies of document.meta written with the live document, for lists and
    #: search: the site never reads inside the JSON for them.
    copies: Callable[[dict[str, Any]], dict[str, Any]]
    #: Where unpublishing leaves it.
    unpublished: Status = Status.DRAFT
    #: Whether ``scheduled_at`` may put it live later.
    schedules: bool = False


def _email_copies(document: dict[str, Any]) -> dict[str, Any]:
    return {"name": document["meta"]["name"]}


def _article_copies(document: dict[str, Any]) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": cover.get("media", {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


def _form_copies(document: dict[str, Any]) -> dict[str, Any]:
    # Publishing is when a form takes its real address.
    return {"name": document["meta"]["name"], "slug": document["meta"]["slug"]}


KINDS: dict[str, Kind] = {
    "emails": Kind(
        kit=Kit.EMAIL,
        noun="email template",
        model=EmailTemplate,
        revision=EmailTemplateRevision,
        copies=_email_copies,
    ),
    "articles": Kind(
        kit=Kit.ARTICLE,
        noun="article",
        model=Article,
        revision=ArticleRevision,
        copies=_article_copies,
        schedules=True,
    ),
    "forms": Kind(
        kit=Kit.FORM,
        noun="form",
        model=Form,
        revision=FormRevision,
        copies=_form_copies,
        # A closed form keeps its link and shows its closed message.
        unpublished=Status.CLOSED,
    ),
}


def kind_of(kind: Literal["emails", "articles", "forms"]) -> Kind:
    return KINDS[kind]


#: The kind named by the URL's ``{kind}``; any other answers 422.
DocumentKind = Annotated[Kind, Depends(kind_of)]
