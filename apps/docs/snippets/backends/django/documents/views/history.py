"""A document's history: its revisions, what it said, for the editor's
version list; and its activity, what happened to it, for your timeline."""

from uuid import UUID

from django.db import transaction
from rest_framework.request import Request
from rest_framework.response import Response

from ..audit import actor_of, record_activity, record_revision
from ..checks import check_document
from ..errors import find
from ..kinds import Kind
from ..models import Action, Activity, RevisionKind
from ..permissions import StaffView
from ..serializers import ActivitySerializer, RevisionSerializer
from .common import body_of, limit_of


class Revisions(StaffView):
    """GET /api/{kind}/:id/revisions: the editor's ``loadRevisions``.
    POST: ``saveRevision``, a version with a name."""

    # Naming a version is editing the document.
    actions = {"POST": "change"}

    def get(self, request: Request, kind: Kind, id: UUID) -> Response:
        revisions = kind.find(id).revisions.select_related("created_by").order_by("-created_at")
        return Response(RevisionSerializer(revisions[: limit_of(request)], many=True).data)

    @transaction.atomic
    def post(self, request: Request, kind: Kind, id: UUID) -> Response:
        body, actor = body_of(request), actor_of(request)
        row = kind.find(id)
        document = body.get("document")
        check_document(kind.kit, document, "draft", type_key=getattr(row, "type_key", None))
        label = body.get("label")
        label = (label.strip()[:120] or None) if isinstance(label, str) else None
        revision = record_revision(row, RevisionKind.MANUAL, document, actor, label=label)
        record_activity(
            row, Action.SAVED, actor, details={"revision": str(revision.uuid), "label": label}
        )
        return Response(RevisionSerializer(revision).data, status=201)


class RevisionDetail(StaffView):
    """GET /api/{kind}/:id/revisions/:rid: the editor's ``loadRevision``."""

    def get(self, request: Request, kind: Kind, id: UUID, revision_id: UUID) -> Response:
        revision = find(kind.find(id).revisions.all(), "revision", uuid=revision_id)
        return Response({"document": revision.document})


class Timeline(StaffView):
    """GET /api/{kind}/:id/activity: what happened to the document, newest first."""

    def get(self, request: Request, kind: Kind, id: UUID) -> Response:
        row = kind.find(id)
        lines = (
            Activity.objects.filter(subject_type=row._meta.db_table, subject_id=row.pk)
            .select_related("actor")
            .order_by("-created_at")
        )
        return Response(ActivitySerializer(lines[: limit_of(request)], many=True).data)
