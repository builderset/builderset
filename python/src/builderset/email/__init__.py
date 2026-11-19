"""Email templates: ``check_email`` and ``render_email``.

``render_email`` writes the same subject, preheader, HTML and text as
``renderEmail`` in ``@builderset/email``, byte for byte. It renders; it does not
send.
"""

from builderset.email.document import (
    DRAFT_TOLERATES,
    check_email,
    is_safe_template_url,
    limits,
    media_keys,
    type_issues,
    variable_uses,
)
from builderset.email.render import DEFAULT_BRAND, RenderedEmail, render_email, social_icon_url
from builderset.email.types import SYSTEM_PATHS, EmailTypeSpec, VariableSpec, variable_paths
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule

__all__ = [
    "DEFAULT_BRAND",
    "DRAFT_TOLERATES",
    "SYSTEM_PATHS",
    "DocumentIssue",
    "EmailTypeSpec",
    "MediaKeyRule",
    "RenderedEmail",
    "VariableSpec",
    "check_email",
    "is_safe_template_url",
    "limits",
    "media_keys",
    "render_email",
    "social_icon_url",
    "type_issues",
    "variable_paths",
    "variable_uses",
]
