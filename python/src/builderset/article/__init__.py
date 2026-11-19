"""Article documents: ``check_article`` and the reading helpers.

There is no article renderer here: the article renderer is React
(``@builderset/article/render``). A Python site serves the document to a
JavaScript front end, or renders it with its own templates.
"""

from builderset.article.document import (
    DRAFT_TOLERATES,
    check_article,
    detect_embed_provider,
    limits,
    media_keys,
    plain_text,
    reading_minutes_of,
)
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule, is_safe_url

__all__ = [
    "DRAFT_TOLERATES",
    "DocumentIssue",
    "MediaKeyRule",
    "check_article",
    "detect_embed_provider",
    "is_safe_url",
    "limits",
    "media_keys",
    "plain_text",
    "reading_minutes_of",
]
