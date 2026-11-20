"""Every table, imported here so ``Base.metadata`` knows them all: Alembic's
``env.py`` sets ``target_metadata = Base.metadata`` after ``import app.models``."""

from app.models.activity import Action, Activity, SubjectType
from app.models.articles import Article, ArticleRevision
from app.models.base import Base, RevisionKind, Status, User
from app.models.cards import (
    CardDesign,
    CardDesignRevision,
    CardFormat,
    CardIssue,
    CardIssueStatus,
    Delivery,
)
from app.models.emails import EmailTemplate, EmailTemplateRevision
from app.models.forms import NEW_RESPONSE, Form, FormResponse, FormRevision
from app.models.library import SECTION_KITS, Kit, Media, MediaKind, SavedSection
from app.models.popups import (
    Popup,
    PopupDailyStat,
    PopupEvent,
    PopupRevision,
    PopupSubmission,
    PopupType,
)

__all__ = [
    "NEW_RESPONSE",
    "SECTION_KITS",
    "Action",
    "Activity",
    "Article",
    "ArticleRevision",
    "Base",
    "CardDesign",
    "CardDesignRevision",
    "CardFormat",
    "CardIssue",
    "CardIssueStatus",
    "Delivery",
    "EmailTemplate",
    "EmailTemplateRevision",
    "Form",
    "FormResponse",
    "FormRevision",
    "Kit",
    "Media",
    "MediaKind",
    "Popup",
    "PopupDailyStat",
    "PopupEvent",
    "PopupRevision",
    "PopupSubmission",
    "PopupType",
    "RevisionKind",
    "SavedSection",
    "Status",
    "SubjectType",
    "User",
]
