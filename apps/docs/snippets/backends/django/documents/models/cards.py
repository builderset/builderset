"""Card designs, their versions, and each card made out to a member from them."""

from django.db import models
from django.db.models import Q

from .base import (
    LIVE,
    AuditedModel,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
    one_of,
    person,
    status_column,
)

CARD_STATUSES = (Status.DRAFT, Status.PUBLISHED)


class CardFormat(models.TextChoices):
    """The card's kind: its size, corners and print rules."""

    MEMBERSHIP = "membership"
    ID = "id"
    BANK = "bank"
    BUSINESS = "business"
    BADGE = "badge"
    WALLET = "wallet"
    CUSTOM = "custom"


class CardDesign(DocumentModel):
    #: document.meta.name.
    name = models.CharField(max_length=120)
    format = models.CharField(
        max_length=20,
        choices=CardFormat,
        default=CardFormat.MEMBERSHIP,
        db_default=CardFormat.MEMBERSHIP,
    )
    # Copies of the document's size, for lists and the print order.
    width_mm = models.DecimalField(max_digits=6, decimal_places=2)
    height_mm = models.DecimalField(max_digits=6, decimal_places=2)
    #: 1, front only; 2, front and back.
    sides = models.SmallIntegerField(default=2, db_default=2)
    #: ``published`` is the design new cards are made from: approved for print.
    status = status_column(CARD_STATUSES)

    class Meta:
        db_table = "card_design"
        permissions = [("publish_carddesign", "Can approve card designs for print")]
        constraints = [
            one_of("format", CardFormat, table="card_design"),
            models.CheckConstraint(condition=Q(sides__in=[1, 2]), name="card_design_sides_check"),
            one_of("status", CARD_STATUSES, table="card_design"),
        ]
        indexes = [models.Index(fields=["-updated_at"], condition=LIVE, name="card_design_list")]


class CardDesignRevision(Revision):
    #: A card finds the design it was printed from by the revision's version.
    card_design = models.ForeignKey(
        CardDesign, on_delete=models.DB_CASCADE, related_name="revisions", db_index=False
    )

    class Meta:
        db_table = "card_design_revision"
        constraints = [one_of("kind", RevisionKind, table="card_design_revision")]
        indexes = [
            models.Index(fields=["card_design", "-created_at"], name="card_design_revision_history")
        ]


class CardIssueStatus(models.TextChoices):
    ISSUED = "issued"
    PRINTED = "printed"
    #: Cancelled for good. The row stays, so the number on the card still points at it.
    REVOKED = "revoked"


class Delivery(models.TextChoices):
    """On plastic, or a wallet pass."""

    PRINT = "print"
    WALLET = "wallet"


class CardIssue(AuditedModel):
    """One card made out to one member: the record a printed or wallet card
    points back to. The design's version and the member's data are frozen when
    it is issued, so a reprint matches the card in their hand. ``created_at``
    is when it was issued."""

    #: A design that has cards is never deleted for good: the database refuses,
    #: as the foreign key has no ``on delete``.
    card_design = models.ForeignKey(
        CardDesign, on_delete=models.DO_NOTHING, related_name="issues", db_index=False
    )
    #: The design's version then: its ``publish`` revision is what was printed.
    design_version = models.IntegerField()
    #: Your member's id, as your system knows it.
    member_ref = models.CharField(max_length=120)
    #: Printed on the card: 0248 1173 5521.
    number = models.CharField(max_length=40)
    #: The fields filled in: { "member.name": "Arben Hoxha" }.
    data = models.JSONField()
    status = models.CharField(
        max_length=16,
        choices=CardIssueStatus,
        default=CardIssueStatus.ISSUED,
        db_default=CardIssueStatus.ISSUED,
    )
    delivery = models.CharField(
        max_length=16, choices=Delivery, default=Delivery.PRINT, db_default=Delivery.PRINT
    )
    #: Printed on the card.
    valid_until = models.DateField(null=True, blank=True)
    printed_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    revoked_by = person()
    revoke_reason = models.CharField(max_length=200, null=True, blank=True)

    class Meta:
        db_table = "card_issue"
        constraints = [
            one_of("status", CardIssueStatus, table="card_issue"),
            one_of("delivery", Delivery, table="card_issue"),
            # A card number is never reused, not even after a revoke.
            models.UniqueConstraint(fields=["number"], name="card_issue_number"),
            # A member holds one valid card of a design at a time.
            models.UniqueConstraint(
                fields=["card_design", "member_ref"],
                condition=~Q(status=CardIssueStatus.REVOKED) & LIVE,
                name="card_issue_one_valid",
            ),
        ]
        indexes = [models.Index(fields=["member_ref", "-created_at"], name="card_issue_by_member")]
