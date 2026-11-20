"""The editor's routes, the same for the three builders: the list, a new
document, its draft, publishing, and deleting and restoring.

Every write is one transaction: check the document, write the row with who
did it, keep a revision on a manual save or a publish, log the activity."""

from datetime import datetime
from typing import Any
from uuid import UUID

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from ..audit import (
    actor_of,
    record_activity,
    record_revision,
    restore,
    soft_delete,
    stamp,
)
from ..checks import check_document
from ..errors import Conflict, Refused
from ..kinds import Kind
from ..models import Action, RevisionKind, Status
from ..models.base import now_ms
from ..permissions import StaffView
from ..serializers import ItemsPagination, ListItemSerializer, WrittenSerializer
from .common import body_of, instant


class DocumentList(StaffView):
    """GET /api/{kind}: your list, or with ``?deleted=true`` the trash.
    POST: a new document, as a draft."""

    def get(self, request: Request, kind: Kind) -> Response:
        params = request.query_params
        if params.get("deleted") == "true":
            rows = kind.model.objects.deleted().order_by("-deleted_at")
        else:
            rows = kind.model.objects.live().order_by("-updated_at")
        if status := params.get("status"):
            rows = rows.filter(status=status)
        if q := params.get("q"):
            rows = rows.filter(**{f"{kind.name_column}__icontains": q})
        pages = ItemsPagination()
        page = pages.paginate_queryset(rows.select_related("updated_by"), request, view=self)
        items = ListItemSerializer(page, many=True, context={"name_column": kind.name_column})
        return pages.get_paginated_response(items.data)

    @transaction.atomic
    def post(self, request: Request, kind: Kind) -> Response:
        body, actor = body_of(request), actor_of(request)
        document = body.get("document")
        columns = kind.new_columns(body, actor)
        check_document(kind.kit, document, "draft", type_key=columns.get("type_key"))
        row = kind.model(
            **{**kind.copies(document), **columns}, document=document, saved_at=now_ms()
        )
        stamp(row, actor)
        try:
            with transaction.atomic():
                row.save()
        except IntegrityError:
            # Another live article has this address in this language.
            raise Refused(issues=[{"code": "meta.slugTaken", "path": "slug"}]) from None
        record_activity(row, Action.CREATED, actor, to_status=row.status)
        return Response(kind.serializer(row).data, status=201)


class DocumentDetail(StaffView):
    """GET /api/{kind}/:id: what the editor's ``reload`` reads. DELETE: to the trash."""

    def get(self, request: Request, kind: Kind, id: UUID) -> Response:
        return Response(kind.serializer(kind.find(id)).data)

    @transaction.atomic
    def delete(self, request: Request, kind: Kind, id: UUID) -> Response:
        soft_delete(kind.find(id, lock=True), actor_of(request))
        return Response(status=204)


# region draft
class Draft(StaffView):
    """PUT /api/{kind}/:id/draft: an autosave or a manual save. Readers still
    get the live document."""

    @transaction.atomic
    def put(self, request: Request, kind: Kind, id: UUID) -> Response:
        body, actor = body_of(request), actor_of(request)
        row = kind.find(id)
        document = body.get("document")
        check_document(kind.kit, document, "draft", type_key=getattr(row, "type_key", None))

        # The editor sends back the saved_at it last saw. Another one here means
        # someone else saved in between; "keep mine" sends force.
        if body.get("force") is not True and instant(body.get("expected_saved_at")) != row.saved_at:
            raise Conflict(message=f"Someone else saved this {kind.noun} since you opened it.")
        # Written only while saved_at is still the one read above, so two saves
        # at the same moment cannot both win.
        saved_at = now_ms()
        written = (
            kind.model.objects.live()
            .filter(pk=row.pk, saved_at=row.saved_at)
            .update_by(actor, draft_document=document, saved_at=saved_at)
        )
        if not written:
            raise Conflict(message=f"Someone else saved this {kind.noun} just now.")
        row.saved_at = saved_at

        # An autosave every few seconds is not history; a manual save is.
        if body.get("reason") == RevisionKind.MANUAL:
            revision = record_revision(row, RevisionKind.MANUAL, document, actor)
            record_activity(row, Action.SAVED, actor, details={"revision": str(revision.uuid)})
        return Response(WrittenSerializer(row).data)


# endregion


# region publish
def scheduled_time(kind: Kind, body: dict[str, Any]) -> datetime | None:
    """When an article should go live, if later than now."""
    later = instant(body.get("scheduled_at")) if kind.schedules else None
    return later if later and later > timezone.now() else None


class Publish(StaffView):
    """POST /api/{kind}/:id/publish: the strict check, then the document goes
    live, or for an article with a future ``scheduled_at``, waits for your job."""

    actions = {"POST": "publish"}

    @transaction.atomic
    def post(self, request: Request, kind: Kind, id: UUID) -> Response:
        body, actor = body_of(request), actor_of(request)
        # Locked: two publishes of one document take turns.
        row = kind.find(id, lock=True)
        document = body.get("document")
        check_document(kind.kit, document, "publish", type_key=getattr(row, "type_key", None))

        from_status = row.status
        for column, value in kind.copies(document).items():
            setattr(row, column, value)
        row.document = document
        row.draft_document = None
        row.version += 1
        row.saved_at = now_ms()
        row.published_by = actor
        stamp(row, actor)
        if later := scheduled_time(kind, body):
            row.status = Status.SCHEDULED
            row.scheduled_at = later
        else:
            row.status = Status.PUBLISHED
            if not (kind.keeps_first_publish and row.published_at):
                row.published_at = timezone.now()
            if kind.on_publish:
                kind.on_publish(row, actor)
        try:
            with transaction.atomic():
                row.save()
        except IntegrityError:
            # Another live form has this address: shown on the field that sets it.
            raise Refused(issues=[{"code": "meta.slugTaken", "path": "meta.slug"}]) from None

        revision = record_revision(row, RevisionKind.PUBLISH, document, actor)
        record_activity(
            row,
            Action.SCHEDULED if later else Action.PUBLISHED,
            actor,
            from_status=from_status,
            to_status=row.status,
            details={"revision": str(revision.uuid)},
        )
        return Response(WrittenSerializer(row).data)


# endregion


class Unpublish(StaffView):
    """POST /api/{kind}/:id/unpublish: readers no longer get it; the document is
    kept. An email or an article goes back to draft; a form closes."""

    actions = {"POST": "publish"}

    @transaction.atomic
    def post(self, request: Request, kind: Kind, id: UUID) -> Response:
        actor = actor_of(request)
        row = kind.find(id, lock=True)
        from_status = row.status
        if from_status in (Status.PUBLISHED, Status.SCHEDULED):
            row.status = kind.unpublished
            if kind.on_unpublish:
                kind.on_unpublish(row, actor)
            stamp(row, actor)
            row.save()
            action = Action.CLOSED if row.status == Status.CLOSED else Action.UNPUBLISHED
            record_activity(row, action, actor, from_status=from_status, to_status=row.status)
        return Response(WrittenSerializer(row).data)


class Restore(StaffView):
    """POST /api/{kind}/:id/restore: back from the trash, as it was."""

    # Undoing a delete takes the right to delete.
    actions = {"POST": "delete"}

    @transaction.atomic
    def post(self, request: Request, kind: Kind, id: UUID) -> Response:
        row = kind.find(id, deleted=True, lock=True)
        restore(row, actor_of(request))
        return Response(kind.serializer(row).data)
