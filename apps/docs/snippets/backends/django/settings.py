"""What the app adds to your project's settings.py, below what is there."""

INSTALLED_APPS += ["rest_framework", "accounts", "documents"]

# Before the first migration: your users, with a public uuid.
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK = {
    # Every refusal is answered in one place: documents/errors.py.
    "EXCEPTION_HANDLER": "documents.errors.answer",
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    # Responses to a public form, per visitor address: 429 past it.
    "DEFAULT_THROTTLE_RATES": {"form_responses": "10/minute"},
}
