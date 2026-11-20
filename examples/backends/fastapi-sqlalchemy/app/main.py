"""The email editor's backend: the routes its REST host calls, and yours.

Run it: ``uv run uvicorn app.main:app --reload``.
"""

from fastapi import FastAPI

from app.errors import add_error_handlers
from app.routers import emails, history, uploads

app = FastAPI(title="Builderset email templates")
add_error_handlers(app)
app.include_router(emails.router)
app.include_router(history.router)
app.include_router(uploads.router)
