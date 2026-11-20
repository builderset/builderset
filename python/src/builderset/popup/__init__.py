"""Popups: ``check_popup`` for the popup a person builds, ``should_show`` for where it shows,
``validate_submission`` for what a visitor sends.

``check_popup`` checks a popup document the way ``checkPopup`` in
``@builderset/popup`` does, with the same codes. ``should_show`` applies its
display rules — device, dates, pages, audience, language, frequency — exactly
as the popup in the browser does, and ``pick_popup`` chooses between several
by priority. ``validate_submission`` checks its inputs' answers and returns
the ones worth keeping. There is no popup renderer here: the renderer is React
(``@builderset/popup/render``).
"""

from builderset.issues import DocumentIssue
from builderset.popup.display import (
    HIDE_REASONS,
    display_hides,
    language_matches,
    local_day,
    normalise_path,
    path_matches,
    pick_popup,
    should_show,
    why_hidden,
)
from builderset.popup.document import (
    DRAFT_TOLERATES,
    WARNINGS,
    can_close,
    check_popup,
    elements_of,
    is_draft_blocking,
    is_publish_blocking,
    is_warning,
    media_keys,
)
from builderset.popup.submission import (
    SubmissionError,
    SubmissionResult,
    inputs_of,
    validate_submission,
)
from builderset.urls import MediaKeyRule

__all__ = [
    "DRAFT_TOLERATES",
    "HIDE_REASONS",
    "WARNINGS",
    "DocumentIssue",
    "MediaKeyRule",
    "SubmissionError",
    "SubmissionResult",
    "can_close",
    "check_popup",
    "display_hides",
    "elements_of",
    "inputs_of",
    "is_draft_blocking",
    "is_publish_blocking",
    "is_warning",
    "language_matches",
    "local_day",
    "media_keys",
    "normalise_path",
    "path_matches",
    "pick_popup",
    "should_show",
    "validate_submission",
    "why_hidden",
]
