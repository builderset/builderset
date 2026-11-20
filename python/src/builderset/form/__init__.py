"""Forms: ``check_form`` for the form a person builds, ``validate_answers`` for what a visitor sends.

``check_form`` checks a form document the way ``checkForm`` in
``@builderset/form`` does, with the same codes. ``validate_answers`` checks a
submission exactly as the form in the browser checked it — which fields show,
which must be answered, what each answer must look like — and returns the
answers worth keeping. There is no form renderer here: the renderer is React
(``@builderset/form/render``).
"""

from builderset.form.answers import (
    AnswerError,
    Answers,
    AnswersResult,
    FormField,
    answer_kind_of,
    check_answer,
    form_fields,
    is_empty,
    is_shown,
    rule_matches,
    steps_of,
    takes_answer,
    validate_answers,
)
from builderset.form.document import (
    DRAFT_TOLERATES,
    WARNINGS,
    check_form,
    is_draft_blocking,
    is_publish_blocking,
    is_warning,
    media_keys,
)
from builderset.issues import DocumentIssue
from builderset.urls import MediaKeyRule

__all__ = [
    "DRAFT_TOLERATES",
    "WARNINGS",
    "AnswerError",
    "Answers",
    "AnswersResult",
    "DocumentIssue",
    "FormField",
    "MediaKeyRule",
    "answer_kind_of",
    "check_answer",
    "check_form",
    "form_fields",
    "is_draft_blocking",
    "is_empty",
    "is_publish_blocking",
    "is_shown",
    "is_warning",
    "media_keys",
    "rule_matches",
    "steps_of",
    "takes_answer",
    "validate_answers",
]
