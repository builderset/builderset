"""The routes visitors use, without signing in: the published form, and a
response to it. And the editor's view of the responses.

The answers are checked against the PUBLISHED document, never the draft, and
only what ``validate_answers`` keeps is stored."""

from datetime import UTC, datetime, timedelta
from ipaddress import ip_address
from typing import Any

from builderset.form import validate_answers
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select, update

from app.documents import Db, current_editor
from app.models import Form, FormResponse

public = APIRouter(prefix="/api/public/forms")


class Submission(BaseModel):
    """What FormView's onSubmit sends: ``values`` as ``answers``, and the trap."""

    answers: dict[str, Any] = {}
    locale: str | None = Field(default=None, max_length=10)
    trap: str = ""


def find_public(db: Db, slug: str) -> Form:
    form = db.scalar(
        select(Form).where(Form.slug == slug, Form.status.in_(("published", "closed")))
    )
    if form is None:
        raise HTTPException(404, "There is no such form.")
    return form


def instant(text: str) -> datetime:
    """A date from the form's settings (ISO); one without a zone is read as UTC."""
    value = datetime.fromisoformat(text)
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def is_closed(form: Form) -> bool:
    """Whether the form takes no responses now: closed by hand, full, or outside its dates."""
    limits = form.document["settings"]["limits"]
    now = datetime.now(UTC)
    opens, closes = limits["opensAt"], limits["closesAt"]
    return (
        form.status == "closed"
        or (limits["maxResponses"] is not None and form.response_count >= limits["maxResponses"])
        or (opens is not None and instant(opens) > now)
        or (closes is not None and instant(closes) <= now)
    )


def ip_of(request: Request) -> str | None:
    """The visitor's address. Behind a proxy, run uvicorn with --proxy-headers."""
    try:
        return str(ip_address(request.client.host)) if request.client else None
    except ValueError:
        return None


def gone(form: Form) -> JSONResponse:
    """410, with the form's own closed message for the visitor."""
    return JSONResponse({"message": form.document["settings"]["limits"]["closedMessage"]}, 410)


@public.get("/{slug}", response_model=None)
def read_form(slug: str, db: Db) -> dict[str, Any] | JSONResponse:
    """The form, for the page that shows it."""
    form = find_public(db, slug)
    if is_closed(form):
        # The page still gets the document: <FormView closed> shows the closed
        # message in the form's own look.
        return JSONResponse({"closed": True, "document": form.document}, 410)
    return {"document": form.document}


@public.post("/{slug}/responses", status_code=201, response_model=None)
def respond(slug: str, body: Submission, request: Request, db: Db) -> dict[str, Any] | JSONResponse:
    """A visitor's response. Put a rate limit in front of it (your proxy, or
    slowapi), answering 429."""
    form = find_public(db, slug)
    if is_closed(form):
        return gone(form)
    # The hidden trap field is filled only by bots. They are told it worked and
    # nothing is stored, so they learn nothing to work around.
    if body.trap:
        return {"id": None}

    result = validate_answers(form.document, body.answers)
    if not result.ok:
        return JSONResponse({"errors": result.as_dict()["errors"]}, 422)

    # Counted and limited in one statement: two last responses at once cannot
    # both get in.
    max_responses = form.document["settings"]["limits"]["maxResponses"]
    room = [Form.id == form.id, Form.status == "published"]
    if max_responses is not None:
        room.append(Form.response_count < max_responses)
    counted = db.execute(
        update(Form).where(*room).values(response_count=Form.response_count + 1).returning(Form.id)
    ).scalar_one_or_none()
    if counted is None:
        return gone(form)

    store_ip = form.document["settings"]["privacy"]["storeIp"]
    response = FormResponse(
        form_id=form.id,
        form_version=form.version,
        # Only the shown fields' answers, numbers as numbers: never the raw body.
        answers=result.values,
        locale=body.locale,
        ip=ip_of(request) if store_ip else None,
    )
    db.add(response)
    db.commit()
    return {"id": response.id}


responses = APIRouter(dependencies=[Depends(current_editor)])


def title_of(answers: dict[str, Any], response_id: int) -> str:
    """A line for the Responses tab: the first text answer."""
    first = next(
        (value for value in answers.values() if isinstance(value, str) and value.strip()), None
    )
    return first[:80] if first else f"Response {response_id}"


@responses.get("/api/forms/{form_id}/responses")
def list_responses(form_id: int, db: Db) -> dict[str, Any]:
    """For the editor's ``loadResponses``, and your inbox."""
    week_ago = datetime.now(UTC) - timedelta(days=7)
    total, this_week = db.execute(
        select(
            func.count(),
            func.count().filter(FormResponse.created_at > week_ago),
        ).where(FormResponse.form_id == form_id)
    ).one()
    latest = db.scalars(
        select(FormResponse)
        .where(FormResponse.form_id == form_id)
        .order_by(FormResponse.created_at.desc())
        .limit(20)
    )
    return {
        "total": total,
        "this_week": this_week,
        "latest": [
            {
                "id": str(row.id),
                "title": title_of(row.answers, row.id),
                "when": row.created_at.isoformat(),
                "status": row.status,
            }
            for row in latest
        ],
    }
