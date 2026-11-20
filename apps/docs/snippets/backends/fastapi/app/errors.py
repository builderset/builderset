"""The errors a route raises. main.py turns each into its answer: the status
code, and a ``message`` the editor shows as it is."""

from typing import Any, ClassVar


class ApiError(Exception):
    status_code: ClassVar[int] = 400

    def __init__(self, message: str, **extra: Any) -> None:
        super().__init__(message)
        self.message = message
        self.extra = extra

    def body(self) -> dict[str, Any]:
        return {"message": self.message, **self.extra}


class SignInRequiredError(ApiError):
    status_code = 401


class NotFoundError(ApiError):
    status_code = 404


class ConflictError(ApiError):
    """A stale save, a live document deleted, an address taken."""

    status_code = 409


class GoneError(ApiError):
    """A form closed or full."""

    status_code = 410


class TooLargeError(ApiError):
    status_code = 413


class UnsupportedTypeError(ApiError):
    status_code = 415


class InvalidInputError(ApiError):
    status_code = 422


class InvalidDocumentError(InvalidInputError):
    """A document the checks refused: the editor shows each issue on its block."""

    def __init__(self, issues: list[dict[str, Any]]) -> None:
        super().__init__("The document was refused.", issues=issues)
