"""The app: the editor's routes for the three builders, and the form's public ones.

Run it: ``uv run uvicorn app.main:app --reload``.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.checks import InvalidDocumentError
from app.documents import KINDS, document_router
from app.forms import public, responses

app = FastAPI(title="Builderset documents")


@app.exception_handler(InvalidDocumentError)
def refused(_request: Request, error: InvalidDocumentError) -> JSONResponse:
    # The editor shows each issue on the block it belongs to.
    return JSONResponse({"issues": error.issues}, status_code=422)


app.include_router(public)
app.include_router(responses)
# One router, three kinds: /api/emails, /api/articles, /api/forms.
for path, kind in KINDS.items():
    app.include_router(document_router(kind), prefix=f"/api/{path}")
