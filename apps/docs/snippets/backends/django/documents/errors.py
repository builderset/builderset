"""Every refusal the API makes, and the one place each becomes an HTTP answer.

Views raise these; ``answer`` turns them into responses. Point DRF at it:
``REST_FRAMEWORK = {"EXCEPTION_HANDLER": "documents.errors.answer"}``."""

from typing import Any

from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Model, QuerySet
from rest_framework.response import Response
from rest_framework.views import exception_handler


class ApiError(Exception):
    """A refusal: its status, and the body the client reads."""

    status = 400

    def __init__(self, **body: Any) -> None:
        super().__init__(body)
        self.body = body


class Missing(ApiError):
    """Not there, or deleted: a deleted row answers this everywhere but restore."""

    status = 404


class Conflict(ApiError):
    """Someone else saved first, the document is live, or its address is taken."""

    status = 409


class Refused(ApiError):
    """``{ issues }`` for a document, ``{ errors }`` for a form's answers."""

    status = 422


class Gone(ApiError):
    """A form closed, full, or outside its dates, with its own closed message."""

    status = 410


class TooLarge(ApiError):
    """An upload past the size you accept."""

    status = 413


class NotAccepted(ApiError):
    """An upload whose first bytes are not a type you accept."""

    status = 415


def find[M: Model](rows: QuerySet[M], noun: str, **lookup: Any) -> M:
    """The one row the lookup names, or 404."""
    try:
        return rows.get(**lookup)
    except ObjectDoesNotExist:
        raise Missing(message=f"There is no such {noun}.") from None


def answer(exc: Exception, context: dict[str, Any]) -> Response | None:
    """DRF's exception handler: ours first, then DRF's own (401, 403, 429…)."""
    if isinstance(exc, ApiError):
        return Response(exc.body, status=exc.status)
    return exception_handler(exc, context)
