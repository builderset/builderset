"""The cards made out from a card design: issuing one to a member, the list,
and revoking. Issuing freezes the design's version and the member's data, so
a reprint matches the card in their hand; a revoked card keeps its row, so
the number printed on it still points at it."""

import secrets
from typing import Any
from uuid import UUID

from builderset.card import fields_used, fill_card
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from ..audit import actor_of, record_activity, stamp
from ..errors import Conflict, Refused, find
from ..models import Action, CardDesign, CardIssue, CardIssueStatus, Delivery, Status
from ..permissions import StaffView
from ..serializers import CardIssueSerializer, ItemsPagination
from .common import body_of, day

#: The longest value of one member field, in characters.
MAX_FIELD_LENGTH = 500

Issues = list[dict[str, str]]


def new_number() -> str:
    """Twelve random digits in groups of four, 0248 1173 5521: nothing to guess
    another member's card from. The unique index refuses the rare repeat."""
    digits = "".join(secrets.choice("0123456789") for _ in range(12))
    return f"{digits[:4]} {digits[4:8]} {digits[8:]}"


# region issue
def member_data(design: CardDesign, data: Any) -> tuple[dict[str, str], Issues]:
    """The member's data the design prints: every field it uses, as text, and
    nothing else. A field it lacks would be printed as ``{{ member.name }}``."""
    if not isinstance(data, dict):
        return {}, [{"code": "data.invalid", "path": "data"}]
    kept: dict[str, str] = {}
    issues: Issues = []
    for field in fields_used(design.document):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            issues.append({"code": "data.fieldMissing", "path": f"data.{field}"})
        elif len(value) > MAX_FIELD_LENGTH:
            issues.append({"code": "data.fieldTooLong", "path": f"data.{field}"})
        else:
            kept[field] = value.strip()
    return kept, issues


def new_issue(design: CardDesign, body: dict[str, Any]) -> CardIssue:
    """A card for one member from the design's live version, or 422 with all
    that is wrong with the request."""
    data, issues = member_data(design, body.get("data"))
    member_ref = body.get("member_ref")
    if not isinstance(member_ref, str) or not 0 < len(member_ref.strip()) <= 120:
        issues.append({"code": "member_ref.invalid", "path": "member_ref"})
    delivery = body.get("delivery", Delivery.PRINT)
    if delivery not in Delivery.values:
        issues.append({"code": "delivery.unknown", "path": "delivery"})
    valid_until = day(body.get("valid_until"))
    if body.get("valid_until") is not None and valid_until is None:
        issues.append({"code": "valid_until.invalid", "path": "valid_until"})
    if issues:
        raise Refused(issues=issues)
    return CardIssue(
        card_design=design,
        design_version=design.version,
        member_ref=member_ref.strip(),
        number=new_number(),
        data=data,
        delivery=delivery,
        valid_until=valid_until,
    )


def constraint_of(error: IntegrityError) -> str | None:
    """The name of the index or constraint that refused a write."""
    return getattr(getattr(error.__cause__, "diag", None), "constraint_name", None)


class CardIssues(StaffView):
    """GET /api/cards/:id/issues: the cards made from a design, newest first;
    ``?status=&member=``. POST: ``{ member_ref, data, delivery, valid_until }``,
    one member's card."""

    model = CardIssue

    def get(self, request: Request, id: UUID) -> Response:
        design = find(CardDesign.objects.live(), "card design", uuid=id)
        issues = design.issues.live().order_by("-created_at", "-id")
        if status := request.query_params.get("status"):
            issues = issues.filter(status=status)
        if member := request.query_params.get("member"):
            issues = issues.filter(member_ref=member)
        pages = ItemsPagination()
        page = pages.paginate_queryset(
            issues.select_related("card_design", "created_by", "updated_by", "revoked_by"),
            request,
            view=self,
        )
        return pages.get_paginated_response(CardIssueSerializer(page, many=True).data)

    @transaction.atomic
    def post(self, request: Request, id: UUID) -> Response:
        actor = actor_of(request)
        # Locked: a publish meanwhile cannot change the version this card records.
        design = find(CardDesign.objects.live().select_for_update(), "card design", uuid=id)
        if design.status != Status.PUBLISHED:
            raise Refused(issues=[{"code": "design.notPublished", "path": "status"}])
        issue = new_issue(design, body_of(request))
        stamp(issue, actor)
        try:
            with transaction.atomic():
                issue.save()
        except IntegrityError as error:
            if constraint_of(error) == "card_issue_one_valid":
                raise Conflict(
                    message="This member already holds a card of this design: revoke it first."
                ) from None
            raise
        record_activity(
            issue,
            Action.ISSUED,
            actor,
            to_status=issue.status,
            details={
                "design": str(design.uuid),
                "design_version": issue.design_version,
                "number": issue.number,
            },
        )
        # The card as it is printed: the design with this member's data written in.
        card = fill_card(design.document, issue.data)
        return Response({**CardIssueSerializer(issue).data, "document": card}, status=201)


# endregion


class RevokeCard(StaffView):
    """POST /api/cards/:id/issues/:iid/revoke: ``{ reason }``. Cancels the card
    for good; the member may be issued a new one, with a new number."""

    model = CardIssue
    actions = {"POST": "change"}

    @transaction.atomic
    def post(self, request: Request, id: UUID, issue_id: UUID) -> Response:
        actor = actor_of(request)
        issues = CardIssue.objects.live().select_for_update()
        issue = find(
            issues.filter(card_design__uuid=id, card_design__deleted_at__isnull=True),
            "card",
            uuid=issue_id,
        )
        if issue.status == CardIssueStatus.REVOKED:
            raise Conflict(message="This card is already revoked.")
        reason = body_of(request).get("reason")
        before = issue.status
        issue.status = CardIssueStatus.REVOKED
        issue.revoked_at = timezone.now()
        issue.revoked_by = actor
        issue.revoke_reason = (reason.strip()[:200] or None) if isinstance(reason, str) else None
        stamp(issue, actor)
        issue.save()
        record_activity(
            issue,
            Action.REVOKED,
            actor,
            from_status=before,
            to_status=issue.status,
            details={"reason": issue.revoke_reason},
        )
        return Response(CardIssueSerializer(issue).data)
