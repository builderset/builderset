"""Popups, their versions, what visitors sent through them, and how they did."""

from django.db import connection, models
from django.db.models import F, Q

from .base import (
    LIVE,
    AuditedModel,
    DocumentModel,
    Revision,
    RevisionKind,
    Status,
    one_of,
    status_column,
)
from .forms import Triage

POPUP_STATUSES = (Status.DRAFT, Status.PUBLISHED, Status.PAUSED)


class PopupType(models.TextChoices):
    """How it sits on the page."""

    MODAL = "modal"
    SLIDEIN = "slidein"
    BARTOP = "bartop"
    BARBOTTOM = "barbottom"
    FULLSCREEN = "fullscreen"
    DRAWER = "drawer"
    INLINE = "inline"


class Popup(DocumentModel):
    #: document.meta.name.
    name = models.CharField(max_length=120)
    type = models.CharField(
        max_length=16, choices=PopupType, default=PopupType.MODAL, db_default=PopupType.MODAL
    )
    #: ``paused`` takes it off the site and keeps it as it is.
    status = status_column(POPUP_STATUSES)

    # Copies of the document's display rules, so the site asks one indexed
    # question: which popups may show on this page now. The rest of the rules
    # (audience, frequency, device) run in the browser with shouldShow.
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    #: When two popups match a page, the higher one shows.
    priority = models.SmallIntegerField(default=0, db_default=0)

    class Meta:
        db_table = "popup"
        permissions = [("publish_popup", "Can publish and pause popups")]
        constraints = [
            one_of("type", PopupType, table="popup"),
            one_of("status", POPUP_STATUSES, table="popup"),
            models.CheckConstraint(
                condition=Q(ends_at__isnull=True)
                | Q(starts_at__isnull=True)
                | Q(ends_at__gt=F("starts_at")),
                name="popup_check",
            ),
        ]
        indexes = [
            # The site's question, on every page view.
            models.Index(
                fields=["-priority"],
                condition=Q(status=Status.PUBLISHED) & LIVE,
                name="popup_live",
            ),
        ]


class PopupRevision(Revision):
    popup = models.ForeignKey(
        Popup, on_delete=models.DB_CASCADE, related_name="revisions", db_index=False
    )

    class Meta:
        db_table = "popup_revision"
        constraints = [one_of("kind", RevisionKind, table="popup_revision")]
        indexes = [models.Index(fields=["popup", "-created_at"], name="popup_revision_history")]


class PopupSubmission(AuditedModel):
    """What a visitor typed into a popup's inputs: the values
    ``validate_submission`` kept, never the raw body. ``created_by`` is the
    visitor when signed in."""

    popup = models.ForeignKey(
        Popup, on_delete=models.DB_CASCADE, related_name="submissions", db_index=False
    )
    #: The version they saw: its ``publish`` revision is the popup as it was.
    popup_version = models.IntegerField()
    answers = models.JSONField()
    #: The page it was sent from.
    page_path = models.CharField(max_length=500, null=True, blank=True)
    locale = models.CharField(max_length=10, null=True, blank=True)
    #: Your team's triage, as a form response's.
    status = models.CharField(
        max_length=30, choices=Triage, default=Triage.NEW, db_default=Triage.NEW
    )
    #: Only if your privacy rules allow it. ``inet`` in PostgreSQL.
    ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = "popup_submission"
        indexes = [
            models.Index(
                fields=["popup", "-created_at"], condition=LIVE, name="popup_submission_inbox"
            ),
        ]


class PopupEvent(models.TextChoices):
    """What PopupView's onEvent reports: each one is a counter of the day's row."""

    SHOWN = "shown"
    CLOSED = "closed"
    CLICKED = "clicked"
    SUBMITTED = "submitted"


class DailyStatManager(models.Manager["PopupDailyStat"]):
    def add_one(self, popup: Popup, event: PopupEvent) -> None:
        """Add one to today's counter. One statement, so two visitors at the same
        moment both count; each counter is a parameter, so no column name is
        ever built from the request."""
        ones = [int(event == counter) for counter in PopupEvent]
        with connection.cursor() as cursor:
            cursor.execute(
                """
                insert into popup_daily_stat (popup_id, day, shown, closed, clicked, submitted)
                values (%s, current_date, %s, %s, %s, %s)
                on conflict (popup_id, day) do update set
                  shown     = popup_daily_stat.shown     + excluded.shown,
                  closed    = popup_daily_stat.closed    + excluded.closed,
                  clicked   = popup_daily_stat.clicked   + excluded.clicked,
                  submitted = popup_daily_stat.submitted + excluded.submitted
                """,
                [popup.pk, *ones],
            )


class PopupDailyStat(models.Model):
    """How one popup did on one day: counters added to, never one row per view."""

    pk = models.CompositePrimaryKey("popup_id", "day")
    popup = models.ForeignKey(
        Popup, on_delete=models.DB_CASCADE, related_name="daily_stats", db_index=False
    )
    day = models.DateField()
    shown = models.IntegerField(default=0, db_default=0)
    closed = models.IntegerField(default=0, db_default=0)
    clicked = models.IntegerField(default=0, db_default=0)
    submitted = models.IntegerField(default=0, db_default=0)

    objects = DailyStatManager()

    class Meta:
        db_table = "popup_daily_stat"
