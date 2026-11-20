"""A form's two audiences: visitors, who see the published form and send a
response without signing in, and your team, who read and triage them."""

from datetime import UTC, datetime, timedelta
from ipaddress import IPv4Address, IPv6Address, ip_address
from uuid import UUID

from builderset.form import validate_answers
from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.audit import find, record_activity, soft_delete, stamp
from app.deps import CurrentUser, SessionDep, Visitor, current_user
from app.errors import GoneError, InvalidInputError, NotFoundError
from app.models import NEW_RESPONSE, Action, Form, FormResponse, Status
from app.schemas import (
    PublicForm,
    Received,
    ResponseLine,
    ResponseOut,
    ResponseSummary,
    Submission,
    Triage,
)

# ── Visitors ────────────────────────────────────────────────────────────────

public = APIRouter(prefix="/api/public/forms")


def _find_public(db: Session, slug: str) -> Form:
    form = db.scalar(
        select(Form).where(
            Form.slug == slug,
            Form.live(),
            Form.status.in_((Status.PUBLISHED, Status.CLOSED)),
        )
    )
    if form is None:
        raise NotFoundError("There is no such form.")
    return form


def _instant(text: str) -> datetime:
    """A date from the form's settings (ISO); one without a zone is read as UTC."""
    value = datetime.fromisoformat(text)
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def _refuse_when_closed(form: Form) -> None:
    """410 with the form's own closed message: closed by hand, full, or outside its dates."""
    limits = form.document["settings"]["limits"]
    now = datetime.now(UTC)
    opens, closes, most = limits["opensAt"], limits["closesAt"], limits["maxResponses"]
    if (
        form.status == Status.CLOSED
        or (most is not None and form.response_count >= most)
        or (opens is not None and _instant(opens) > now)
        or (closes is not None and _instant(closes) <= now)
    ):
        # The page still gets the document: <FormView closed> shows the
        # message in the form's own look.
        raise GoneError(limits["closedMessage"], closed=True, document=form.document)


def _take_a_place(db: Session, form: Form) -> None:
    """Count the response, unless the form filled up meanwhile. One statement,
    so two last responses at once cannot both get in."""
    most = form.document["settings"]["limits"]["maxResponses"]
    room = [Form.id == form.id, Form.status == Status.PUBLISHED]
    if most is not None:
        room.append(Form.response_count < most)
    counted = db.scalar(
        update(Form).where(*room).values(response_count=Form.response_count + 1).returning(Form.id)
    )
    if counted is None:
        raise GoneError(form.document["settings"]["limits"]["closedMessage"])


def _ip_of(request: Request) -> IPv4Address | IPv6Address | None:
    """The visitor's address. Behind a proxy, run uvicorn with --proxy-headers."""
    try:
        return ip_address(request.client.host) if request.client else None
    except ValueError:
        return None


@public.get("/{slug}")
def read_form(slug: str, db: SessionDep) -> PublicForm:
    """The published form, for the page that shows it. Never the draft."""
    form = _find_public(db, slug)
    _refuse_when_closed(form)
    return PublicForm(document=form.document)


@public.post("/{slug}/responses", status_code=201)
def respond(
    slug: str, body: Submission, request: Request, db: SessionDep, visitor: Visitor
) -> Received:
    """FormView's ``onSubmit``. Put a rate limit in front of it (your proxy, or
    slowapi), answering 429."""
    form = _find_public(db, slug)
    _refuse_when_closed(form)
    # The hidden trap field is filled only by bots. They are told it worked and
    # nothing is stored, so they learn nothing to work around.
    if body.trap:
        return Received(id=None)
    # Checked against the published document: the form the visitor saw.
    result = validate_answers(form.document, body.answers)
    if not result.ok:
        raise InvalidInputError(
            "Some answers need another look.", errors=result.as_dict()["errors"]
        )
    _take_a_place(db, form)

    store_ip = form.document["settings"]["privacy"]["storeIp"]
    response = FormResponse(
        form_id=form.id,
        form_version=form.version,
        # Only the shown fields' answers, numbers as numbers: never the raw body.
        answers=result.values,
        locale=body.locale,
        ip=_ip_of(request) if store_ip else None,
        created_by=visitor,
    )
    db.add(response)
    record_activity(db, response, Action.CREATED, visitor, to_status=NEW_RESPONSE)
    db.commit()
    return Received(id=response.uuid)


# ── Your team ───────────────────────────────────────────────────────────────

inbox = APIRouter(prefix="/api/forms/{form_id}/responses", dependencies=[Depends(current_user)])


def _find_response(db: Session, form_id: UUID, response_id: UUID) -> FormResponse:
    form = find(db, Form, form_id)
    response = db.scalar(
        select(FormResponse).where(
            FormResponse.form_id == form.id,
            FormResponse.uuid == response_id,
            FormResponse.live(),
        )
    )
    if response is None:
        raise NotFoundError("There is no such response.")
    return response


def _title_of(response: FormResponse) -> str:
    """A line for the Responses tab: the first text answer."""
    first = next(
        (value for value in response.answers.values() if isinstance(value, str) and value.strip()),
        None,
    )
    return first[:80] if first else f"Response of {response.created_at:%d %b %Y}"


@inbox.get("")
def summary(form_id: UUID, db: SessionDep) -> ResponseSummary:
    """For the editor's ``loadResponses``, and your inbox."""
    form = find(db, Form, form_id)
    week_ago = datetime.now(UTC) - timedelta(days=7)
    total, this_week = db.execute(
        select(func.count(), func.count().filter(FormResponse.created_at > week_ago)).where(
            FormResponse.form_id == form.id, FormResponse.live()
        )
    ).one()
    latest = db.scalars(
        select(FormResponse)
        .where(FormResponse.form_id == form.id, FormResponse.live())
        .order_by(FormResponse.created_at.desc())
        .limit(20)
    )
    lines = [
        ResponseLine(id=row.uuid, title=_title_of(row), when=row.created_at, status=row.status)
        for row in latest
    ]
    return ResponseSummary(total=total, this_week=this_week, latest=lines)


@inbox.patch("/{response_id}")
def triage(
    form_id: UUID, response_id: UUID, body: Triage, db: SessionDep, user: CurrentUser
) -> ResponseOut:
    """Your team's status and note on a response."""
    response = _find_response(db, form_id, response_id)
    before = response.status
    if body.status is not None:
        response.status = body.status
    if body.note is not None:
        response.note = body.note
    stamp(response, user)
    if response.status != before:
        record_activity(
            db, response, Action.STATUS_CHANGED, user, from_status=before, to_status=response.status
        )
    db.commit()
    return ResponseOut.model_validate(response)


@inbox.delete("/{response_id}", status_code=204)
def delete_response(form_id: UUID, response_id: UUID, db: SessionDep, user: CurrentUser) -> None:
    soft_delete(db, _find_response(db, form_id, response_id), user)
    db.commit()
