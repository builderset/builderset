"""The cards made out from a card design: issuing one to a member, the list,
and revoking. Issuing freezes the design's version and the member's data, so
a reprint matches the card in their hand; a revoked card keeps its row, so the
number printed on it still points at it."""

import secrets
from typing import Annotated, Any
from uuid import UUID

from builderset.card import fields_used, fill_card
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.audit import find, record_activity, stamp
from app.deps import CurrentUser, SessionDep, current_user
from app.errors import ConflictError, InvalidInputError, NotFoundError
from app.models import Action, CardDesign, CardIssue, CardIssueStatus, Status
from app.schemas import CardIssueOut, CardIssuePage, IssuedCard, NewCardIssue, Revocation

router = APIRouter(prefix="/api/cards/{design_id}/issues", dependencies=[Depends(current_user)])

#: The longest value of one member field, in characters.
MAX_FIELD_LENGTH = 500


def _new_number() -> str:
    """Twelve random digits in groups of four, 0248 1173 5521: nothing to guess
    another member's card from. The unique index refuses the rare repeat."""
    digits = "".join(secrets.choice("0123456789") for _ in range(12))
    return f"{digits[:4]} {digits[4:8]} {digits[8:]}"


def _member_data(design: CardDesign, data: dict[str, Any]) -> dict[str, str]:
    """The member's data the design prints: every field it uses, as text, and
    nothing else. A field it lacks would be printed as ``{{ member.name }}``."""
    kept: dict[str, str] = {}
    issues = []
    for field in fields_used(design.document):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            issues.append({"code": "data.fieldMissing", "path": f"data.{field}"})
        elif len(value) > MAX_FIELD_LENGTH:
            issues.append({"code": "data.fieldTooLong", "path": f"data.{field}"})
        else:
            kept[field] = value.strip()
    if issues:
        raise InvalidInputError("The card needs the member's data it prints.", issues=issues)
    return kept


def _constraint_of(error: IntegrityError) -> str | None:
    """The name of the index or constraint that refused a write."""
    return getattr(getattr(error.orig, "diag", None), "constraint_name", None)


def _find_issue(db: Session, design: CardDesign, issue_id: UUID) -> CardIssue:
    issue = db.scalar(
        select(CardIssue)
        .where(
            CardIssue.card_design_id == design.id,
            CardIssue.uuid == issue_id,
            CardIssue.live(),
        )
        .with_for_update()
    )
    if issue is None:
        raise NotFoundError("There is no such card.")
    return issue


@router.get("")
def list_issues(
    design_id: UUID,
    db: SessionDep,
    status: CardIssueStatus | None = None,
    member: str | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> CardIssuePage:
    """The cards made from a design, newest first."""
    design = find(db, CardDesign, design_id)
    where = [CardIssue.card_design_id == design.id, CardIssue.live()]
    if status is not None:
        where.append(CardIssue.status == status)
    if member:
        where.append(CardIssue.member_ref == member)
    total = db.scalar(select(func.count()).select_from(CardIssue).where(*where))
    issues = db.scalars(
        select(CardIssue)
        .where(*where)
        .order_by(CardIssue.created_at.desc(), CardIssue.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return CardIssuePage(
        items=[CardIssueOut.model_validate(issue) for issue in issues], total=total or 0
    )


@router.post("", status_code=201)
def issue_card(
    design_id: UUID, body: NewCardIssue, db: SessionDep, user: CurrentUser
) -> IssuedCard:
    """One member's card, from the design's live version: 422 while it is a
    draft, 409 when the member already holds one."""
    # Locked: a publish meanwhile cannot change the version this card records.
    design = find(db, CardDesign, design_id, lock=True)
    if design.status != Status.PUBLISHED:
        raise InvalidInputError(
            "Approve this design for print before issuing cards.",
            issues=[{"code": "design.notPublished", "path": "status"}],
        )
    issue = CardIssue(
        card_design=design,
        design_version=design.version,
        member_ref=body.member_ref.strip(),
        number=_new_number(),
        data=_member_data(design, body.data),
        status=CardIssueStatus.ISSUED,
        delivery=body.delivery,
        valid_until=body.valid_until,
    )
    stamp(issue, user)
    db.add(issue)
    try:
        db.flush()
    except IntegrityError as error:
        if _constraint_of(error) == "card_issue_one_valid":
            raise ConflictError(
                "This member already holds a card of this design: revoke it first."
            ) from None
        raise
    record_activity(
        db,
        issue,
        Action.ISSUED,
        user,
        to_status=issue.status,
        details={
            "design": str(design.uuid),
            "design_version": issue.design_version,
            "number": issue.number,
        },
    )
    db.commit()
    # The card as it is printed: the design with this member's data written in.
    card = fill_card(design.document, issue.data)
    return IssuedCard.model_validate(issue).model_copy(update={"document": card})


@router.post("/{issue_id}/revoke")
def revoke(
    design_id: UUID, issue_id: UUID, body: Revocation, db: SessionDep, user: CurrentUser
) -> CardIssueOut:
    """Cancels a card for good; the member may be issued a new one, with a new number."""
    issue = _find_issue(db, find(db, CardDesign, design_id), issue_id)
    if issue.status == CardIssueStatus.REVOKED:
        raise ConflictError("This card is already revoked.")
    before = issue.status
    issue.status = CardIssueStatus.REVOKED
    issue.revoked_at = func.now()
    issue.revoked_by = user
    issue.revoke_reason = (body.reason or "").strip() or None
    stamp(issue, user)
    record_activity(
        db,
        issue,
        Action.REVOKED,
        user,
        from_status=before,
        to_status=issue.status,
        details={"reason": issue.revoke_reason},
    )
    db.commit()
    return CardIssueOut.model_validate(issue)
