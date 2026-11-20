"""The app: the editor's routes for the three builders, the library, and the
form's public routes.

Run it: ``uv run uvicorn app.main:app --reload``.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import storage
from app.errors import ApiError
from app.routers import documents, forms, history, library

app = FastAPI(title="Builderset documents")


@app.exception_handler(ApiError)
def answer_error(_request: Request, error: ApiError) -> JSONResponse:
    """The one place an error becomes an answer: 404, 409, 410, 422…"""
    return JSONResponse(error.body(), status_code=error.status_code)


# The first route that matches wins: the files, /api/uploads and
# /api/emails/sections come before /api/{kind}/{id}.
app.mount("/api/uploads", StaticFiles(directory=storage.ROOT, check_dir=False), name="uploads")
app.include_router(library.router)
app.include_router(forms.public)
app.include_router(forms.inbox)
app.include_router(history.router)
app.include_router(documents.router)
