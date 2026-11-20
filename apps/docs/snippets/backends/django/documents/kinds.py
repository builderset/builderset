"""What differs between emails, articles and forms is a small table: the
model, the kit, the columns copied from the document, what publishing and
unpublishing also change. The views are written once, for whichever row of
it the path names."""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from django.utils import timezone

from .audit import Actor, record_activity, stamp
from .checks import EMAIL_TYPES, LOCALES
from .errors import Refused, find
from .models import Action, Article, DocumentModel, EmailTemplate, Form, Kit, Status
from .serializers import (
    ArticleSerializer,
    DocumentSerializer,
    EmailTemplateSerializer,
    FormSerializer,
)

Document = dict[str, Any]
#: Changes to the row, made with the write, in the same transaction.
Hook = Callable[[Any, Actor], None]


@dataclass(frozen=True)
class Kind:
    #: The path segment: /api/emails.
    path: str
    kit: Kit
    model: type[DocumentModel]
    serializer: type[DocumentSerializer]
    noun: str
    #: The column your list shows as each row's name, and ``q`` searches.
    name_column: str
    #: Copies of the live document's meta, for lists and search.
    copies: Callable[[Document], dict[str, Any]]
    #: The columns a new row takes from the request body and the signed-in user.
    new_columns: Callable[[dict[str, Any], Actor], dict[str, Any]]
    on_publish: Hook | None = None
    on_unpublish: Hook | None = None
    #: Where unpublishing leaves it.
    unpublished: Status = Status.DRAFT
    #: Whether ``scheduled_at`` may put it live later.
    schedules: bool = False
    #: Whether ``published_at`` stays the first publish: an article's list sorts by it.
    keeps_first_publish: bool = False

    def find(self, id: UUID, *, deleted: bool = False, lock: bool = False) -> Any:
        """The row the path names: live, or for restore, deleted."""
        rows = self.model.objects.deleted() if deleted else self.model.objects.live()
        return find(rows.select_for_update() if lock else rows, self.noun, uuid=id)


# ── Emails ──────────────────────────────────────────────────────────────────


def _email_columns(body: dict[str, Any], _actor: Actor) -> dict[str, Any]:
    # Only a type the project has: its key picks the variables checked.
    type_key = body.get("type_key")
    return {"type_key": type_key if type_key in EMAIL_TYPES else None}


def _step_down_active(row: EmailTemplate, actor: Actor) -> None:
    """One active design per email type: the one before goes back to draft."""
    if not row.type_key:
        return
    before = (
        EmailTemplate.objects.live()
        .select_for_update()
        .filter(type_key=row.type_key, status=Status.PUBLISHED)
        .exclude(pk=row.pk)
    )
    for previous in before:
        previous.status = Status.DRAFT
        stamp(previous, actor)
        previous.save(update_fields=["status", "updated_by", "updated_at"])
        record_activity(
            previous,
            Action.UNPUBLISHED,
            actor,
            from_status=Status.PUBLISHED,
            to_status=Status.DRAFT,
            details={"replaced_by": str(row.uuid)},
        )


# ── Articles ────────────────────────────────────────────────────────────────


def _article_columns(body: dict[str, Any], actor: Actor) -> dict[str, Any]:
    # The address is the article's, chosen when it is made.
    slug, locale = body.get("slug"), body.get("locale")
    if not isinstance(slug, str) or not slug.strip():
        raise Refused(issues=[{"code": "meta.slugMissing", "path": "slug"}])
    if locale not in LOCALES:
        raise Refused(issues=[{"code": "i18n.locale.unknown", "path": "locale"}])
    return {"slug": slug.strip()[:200], "locale": locale, "author": actor}


def _article_copies(document: Document) -> dict[str, Any]:
    meta = document["meta"]
    cover = meta.get("cover") or {}
    return {
        "title": meta["title"],
        "excerpt": meta.get("excerpt") or "",
        "cover_key": (cover.get("media") or {}).get("key"),
        "cover_alt": cover.get("alt"),
    }


def _unschedule(row: Article, _actor: Actor) -> None:
    row.scheduled_at = None


# ── Forms ───────────────────────────────────────────────────────────────────


def _form_columns(_body: dict[str, Any], _actor: Actor) -> dict[str, Any]:
    # A new form has no address yet: it holds draft-<uuid>, unique like the
    # uuid, until publishing copies document.meta.slug.
    public_id = uuid.uuid4()
    return {"uuid": public_id, "slug": f"draft-{public_id}"}


def _reopen(row: Form, _actor: Actor) -> None:
    row.closed_at = None
    row.closed_by = None


def _close(row: Form, actor: Actor) -> None:
    row.closed_at = timezone.now()
    row.closed_by = actor


KINDS: dict[str, Kind] = {
    kind.path: kind
    for kind in (
        Kind(
            path="emails",
            kit=Kit.EMAIL,
            model=EmailTemplate,
            serializer=EmailTemplateSerializer,
            noun="email template",
            name_column="name",
            copies=lambda document: {"name": document["meta"]["name"]},
            new_columns=_email_columns,
            on_publish=_step_down_active,
        ),
        Kind(
            path="articles",
            kit=Kit.ARTICLE,
            model=Article,
            serializer=ArticleSerializer,
            noun="article",
            name_column="title",
            copies=_article_copies,
            new_columns=_article_columns,
            on_publish=_unschedule,
            on_unpublish=_unschedule,
            schedules=True,
            keeps_first_publish=True,
        ),
        Kind(
            path="forms",
            kit=Kit.FORM,
            model=Form,
            serializer=FormSerializer,
            noun="form",
            name_column="name",
            copies=lambda document: {
                "name": document["meta"]["name"],
                "slug": document["meta"]["slug"],
            },
            new_columns=_form_columns,
            on_publish=_reopen,
            on_unpublish=_close,
            # A closed form keeps its link and shows its closed message.
            unpublished=Status.CLOSED,
        ),
    )
}
