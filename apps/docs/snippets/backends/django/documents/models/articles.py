"""Articles: pages of your site's blog or help centre, per language, and their versions."""

from django.db import models
from django.db.models import Q

from .base import (
    LIVE,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
    one_of,
    person,
    status_column,
)

ARTICLE_STATUSES = (Status.DRAFT, Status.SCHEDULED, Status.PUBLISHED, Status.ARCHIVED)


class Article(DocumentModel):
    # Where it lives
    #: The address, per language.
    slug = models.CharField(max_length=200)
    #: The language its tree is written in.
    locale = models.CharField(max_length=10)
    status = status_column(ARTICLE_STATUSES)
    #: A job of yours publishes a scheduled article then.
    scheduled_at = models.DateTimeField(null=True, blank=True)

    # Copies of document.meta, written in the same transaction as the document,
    # for lists, search and cards: the site never reads inside the JSON for them.
    title = models.CharField(max_length=300, default="", db_default="")
    excerpt = models.CharField(max_length=600, default="", db_default="")
    cover_key = models.CharField(max_length=300, null=True, blank=True)
    cover_alt = models.CharField(max_length=300, null=True, blank=True)
    #: The byline: not always who created the row.
    author = person()

    class Meta:
        db_table = "article"
        permissions = [("publish_article", "Can publish articles")]
        constraints = [
            one_of("status", ARTICLE_STATUSES, table="article"),
            # One article per address and language among live rows, so a
            # deleted article frees its slug instead of keeping it forever.
            models.UniqueConstraint(
                fields=["slug", "locale"], condition=LIVE, name="article_slug_locale"
            ),
        ]
        indexes = [
            # The site's list: published, in one language, newest first.
            models.Index(
                fields=["locale", "-published_at"],
                condition=Q(status=Status.PUBLISHED) & LIVE,
                name="article_published",
            ),
            # The job's question: which scheduled articles are due.
            models.Index(
                fields=["scheduled_at"],
                condition=Q(status=Status.SCHEDULED) & LIVE,
                name="article_due",
            ),
        ]


class ArticleRevision(Revision):
    article = models.ForeignKey(
        Article, on_delete=models.DB_CASCADE, related_name="revisions", db_index=False
    )

    class Meta:
        db_table = "article_revision"
        constraints = [one_of("kind", RevisionKind, table="article_revision")]
        indexes = [models.Index(fields=["article", "-created_at"], name="article_revision_history")]
