"""Every table, imported here so ``Base.metadata`` knows them all: Alembic's
``env.py`` sets ``target_metadata = Base.metadata`` after ``import app.models``."""

from app.models.activity import Action, Activity, SubjectType
from app.models.articles import Article, ArticleRevision
from app.models.base import Base, RevisionKind, Status, User
from app.models.emails import EmailTemplate, EmailTemplateRevision
from app.models.forms import NEW_RESPONSE, Form, FormResponse, FormRevision
from app.models.library import Kit, Media, MediaKind, SavedSection

__all__ = [
    "NEW_RESPONSE",
    "Action",
    "Activity",
    "Article",
    "ArticleRevision",
    "Base",
    "EmailTemplate",
    "EmailTemplateRevision",
    "Form",
    "FormResponse",
    "FormRevision",
    "Kit",
    "Media",
    "MediaKind",
    "RevisionKind",
    "SavedSection",
    "Status",
    "SubjectType",
    "User",
]
