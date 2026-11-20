"""Articles: the pages of your site's blog or help centre, per language."""

from datetime import datetime

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym

from app.models.base import (
    Audited,
    Base,
    DocumentMixin,
    RevisionMixin,
    Status,
    User,
    one_of,
    user_id,
)

ARTICLE_STATUSES = (Status.DRAFT, Status.SCHEDULED, Status.PUBLISHED, Status.ARCHIVED)


class Article(Audited, DocumentMixin, Base):
    __tablename__ = "article"
    __table_args__ = (one_of("status", ARTICLE_STATUSES),)

    # Where it lives
    slug: Mapped[str] = mapped_column(String(200))
    locale: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(16), server_default=Status.DRAFT)
    #: A job of yours publishes a scheduled article then.
    scheduled_at: Mapped[datetime | None]

    # Copies of document.meta, written in the same transaction as the document,
    # for lists, search and cards: the site never reads inside the JSON for them.
    title: Mapped[str] = mapped_column(String(300), server_default="")
    excerpt: Mapped[str] = mapped_column(String(600), server_default="")
    cover_key: Mapped[str | None] = mapped_column(String(300))
    cover_alt: Mapped[str | None] = mapped_column(String(300))
    #: The byline: not always who created the row.
    author_id: Mapped[int | None] = user_id()
    author: Mapped[User | None] = relationship(foreign_keys=[author_id])

    #: Lists name every document the same way; an article's name is its title.
    name: Mapped[str] = synonym("title")


# One article per address and language. Partial, so a deleted article frees
# its slug instead of keeping it forever.
Index(
    "article_slug_locale",
    Article.slug,
    Article.locale,
    unique=True,
    postgresql_where=Article.live(),
)
# The site's list: published, in one language, newest first.
Index(
    "article_published",
    Article.locale,
    Article.published_at.desc(),
    postgresql_where=(Article.status == Status.PUBLISHED) & Article.live(),
)
# The job's question: which scheduled articles are due.
Index(
    "article_due",
    Article.scheduled_at,
    postgresql_where=(Article.status == Status.SCHEDULED) & Article.live(),
)


class ArticleRevision(RevisionMixin, Base):
    __tablename__ = "article_revision"

    document_id: Mapped[int] = mapped_column(
        "article_id", ForeignKey("article.id", ondelete="CASCADE")
    )


Index("article_revision_history", ArticleRevision.document_id, ArticleRevision.created_at.desc())
