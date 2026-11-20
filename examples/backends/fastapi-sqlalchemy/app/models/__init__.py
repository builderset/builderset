"""The tables, one group per module. Importing this package registers them all
on ``Base.metadata``, which Alembic compares against."""

from app.models.activity import Action, Activity, SubjectType
from app.models.base import AppUser, Audited, Base
from app.models.emails import EmailTemplate, EmailTemplateRevision, RevisionKind, Status

__all__ = [
    "Action",
    "Activity",
    "AppUser",
    "Audited",
    "Base",
    "EmailTemplate",
    "EmailTemplateRevision",
    "RevisionKind",
    "Status",
    "SubjectType",
]
