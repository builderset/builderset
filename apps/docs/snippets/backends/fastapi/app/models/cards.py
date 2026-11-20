"""Card designs, their versions, and each card made out to a member from them."""

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, SmallInteger, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import (
    Audited,
    Base,
    DocumentMixin,
    RevisionMixin,
    Status,
    User,
    one_of,
    user_id,
)

CARD_STATUSES = (Status.DRAFT, Status.PUBLISHED)


class CardFormat(StrEnum):
    """The card's kind: its size, corners and print rules."""

    MEMBERSHIP = "membership"
    ID = "id"
    BANK = "bank"
    BUSINESS = "business"
    BADGE = "badge"
    WALLET = "wallet"
    CUSTOM = "custom"


class CardDesign(Audited, DocumentMixin, Base):
    __tablename__ = "card_design"
    __table_args__ = (
        one_of("format", CardFormat),
        CheckConstraint("sides in (1, 2)", name="sides_check"),
        one_of("status", CARD_STATUSES),
    )

    #: A copy of document.meta.name, for your list.
    name: Mapped[str] = mapped_column(String(120))
    format: Mapped[str] = mapped_column(String(20), server_default=CardFormat.MEMBERSHIP)
    # Copies of the document's size, for lists and the print order.
    width_mm: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    height_mm: Mapped[Decimal] = mapped_column(Numeric(6, 2))
    #: 1, front only; 2, front and back.
    sides: Mapped[int] = mapped_column(SmallInteger, server_default=text("2"))
    #: ``published`` is the design new cards are made from: approved for print.
    status: Mapped[str] = mapped_column(String(16), server_default=Status.DRAFT)


Index("card_design_list", CardDesign.updated_at.desc(), postgresql_where=CardDesign.live())


class CardDesignRevision(RevisionMixin, Base):
    __tablename__ = "card_design_revision"

    #: A card finds the design it was printed from by the revision's version.
    document_id: Mapped[int] = mapped_column(
        "card_design_id", ForeignKey("card_design.id", ondelete="CASCADE")
    )


Index(
    "card_design_revision_history",
    CardDesignRevision.document_id,
    CardDesignRevision.created_at.desc(),
)


class CardIssueStatus(StrEnum):
    ISSUED = "issued"
    PRINTED = "printed"
    #: Cancelled for good. The row stays, so the number on the card still points at it.
    REVOKED = "revoked"


class Delivery(StrEnum):
    """On plastic, or a wallet pass."""

    PRINT = "print"
    WALLET = "wallet"


class CardIssue(Audited, Base):
    """One card made out to one member: the record a printed or wallet card
    points back to. The design's version and the member's data are frozen when
    it is issued, so a reprint matches the card in their hand. ``created_at``
    is when it was issued."""

    __tablename__ = "card_issue"
    __table_args__ = (one_of("status", CardIssueStatus), one_of("delivery", Delivery))

    #: No ``on delete``: a design that has cards is never deleted for good.
    card_design_id: Mapped[int] = mapped_column(ForeignKey("card_design.id"))
    card_design: Mapped[CardDesign] = relationship()
    #: The design's version then: its ``publish`` revision is what was printed.
    design_version: Mapped[int]
    #: Your member's id, as your system knows it.
    member_ref: Mapped[str] = mapped_column(String(120))
    #: Printed on the card: 0248 1173 5521.
    number: Mapped[str] = mapped_column(String(40))
    #: The fields filled in: { "member.name": "Arben Hoxha" }.
    data: Mapped[dict[str, Any]]
    status: Mapped[str] = mapped_column(String(16), server_default=CardIssueStatus.ISSUED)
    delivery: Mapped[str] = mapped_column(String(16), server_default=Delivery.PRINT)
    #: Printed on the card.
    valid_until: Mapped[date | None]
    printed_at: Mapped[datetime | None]
    revoked_at: Mapped[datetime | None]
    revoked_by_id: Mapped[int | None] = user_id()
    revoked_by: Mapped[User | None] = relationship(foreign_keys=[revoked_by_id])
    revoke_reason: Mapped[str | None] = mapped_column(String(200))


# A card number is never reused, not even after a revoke.
Index("card_issue_number", CardIssue.number, unique=True)
# A member holds one valid card of a design at a time.
Index(
    "card_issue_one_valid",
    CardIssue.card_design_id,
    CardIssue.member_ref,
    unique=True,
    postgresql_where=(CardIssue.status != CardIssueStatus.REVOKED) & CardIssue.live(),
)
Index("card_issue_by_member", CardIssue.member_ref, CardIssue.created_at.desc())
