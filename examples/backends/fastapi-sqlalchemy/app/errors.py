"""The one place a refusal becomes an HTTP answer. Handlers raise these; they
never build an error response themselves."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from psycopg.errors import UniqueViolation
from sqlalchemy.exc import IntegrityError


class ApiError(Exception):
    """A refusal, answered as ``{"detail": message}`` with its status code."""

    status_code = 400

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(ApiError):
    status_code = 404


class ConflictError(ApiError):
    status_code = 409


class TooLargeError(ApiError):
    status_code = 413


class UnsupportedMediaError(ApiError):
    status_code = 415


class InvalidDocumentError(ApiError):
    """A document the server will not store, answered with its issues."""

    status_code = 422

    def __init__(self, issues: list[dict[str, Any]]) -> None:
        super().__init__("The document was refused.")
        self.issues = issues


def refused(_request: Request, error: ApiError) -> JSONResponse:
    if isinstance(error, InvalidDocumentError):
        # The editor shows each issue on the block it belongs to.
        return JSONResponse({"issues": error.issues}, status_code=error.status_code)
    return JSONResponse({"detail": error.message}, status_code=error.status_code)


def clashed(_request: Request, error: IntegrityError) -> JSONResponse:
    # A partial unique index refused the write: two designs made active for
    # one email type at the same moment. Any other integrity error is a bug.
    if not isinstance(error.orig, UniqueViolation):
        raise error
    message = "Another live row already holds this place. Reload and try again."
    return JSONResponse({"detail": message}, status_code=409)


def add_error_handlers(app: FastAPI) -> None:
    app.exception_handler(ApiError)(refused)
    app.exception_handler(IntegrityError)(clashed)
