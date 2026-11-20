"""What each answer says. The public ``uuid`` goes out as ``id``; the internal
id never leaves the server, and people are ``{ id, name }`` or null."""

from typing import Any

from django.contrib.auth.base_user import AbstractBaseUser
from django.core.files.storage import default_storage
from rest_framework import serializers
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from .models import (
    Activity,
    Article,
    CardDesign,
    CardIssue,
    EmailTemplate,
    Form,
    FormResponse,
    Media,
    Popup,
    Revision,
    SavedSection,
)


def name_of(user: AbstractBaseUser) -> str:
    """The name shown beside what a person did."""
    full_name: str = getattr(user, "get_full_name", lambda: "")()
    return full_name or user.get_username()


class PersonField(serializers.Field):
    """A user column as ``{ id, name }``. DRF answers null for an empty one."""

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(read_only=True, **kwargs)

    def to_representation(self, value: Any) -> dict[str, str]:
        return {"id": str(value.uuid), "name": name_of(value)}


# fmt: off
AUDIT_FIELDS = (
    "id", "created_at", "created_by", "updated_at", "updated_by", "deleted_at", "deleted_by",
)
DOCUMENT_FIELDS = (
    *AUDIT_FIELDS,
    "status", "document", "draft_document", "saved_at", "version", "published_at", "published_by",
)
# fmt: on


class AuditedSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="uuid", read_only=True)
    created_by = PersonField()
    updated_by = PersonField()
    deleted_by = PersonField()


class DocumentSerializer(AuditedSerializer):
    """A document row, as ``GET /api/{kind}/:id`` answers it and ``reload`` reads it."""

    published_by = PersonField()


class EmailTemplateSerializer(DocumentSerializer):
    class Meta:
        model = EmailTemplate
        fields = (*DOCUMENT_FIELDS, "name", "type_key")


class ArticleSerializer(DocumentSerializer):
    author = PersonField()

    class Meta:
        model = Article
        fields = (
            *DOCUMENT_FIELDS,
            *("slug", "locale", "scheduled_at", "author"),
            *("title", "excerpt", "cover_key", "cover_alt"),  # copies of document.meta
        )


class FormSerializer(DocumentSerializer):
    closed_by = PersonField()

    class Meta:
        model = Form
        fields = (*DOCUMENT_FIELDS, "slug", "name", "closed_at", "closed_by", "response_count")


class CardDesignSerializer(DocumentSerializer):
    # Numbers, as the document has them, not the decimal column's strings.
    width_mm = serializers.FloatField(read_only=True)
    height_mm = serializers.FloatField(read_only=True)

    class Meta:
        model = CardDesign
        fields = (*DOCUMENT_FIELDS, "name", "format", "width_mm", "height_mm", "sides")


class PopupSerializer(DocumentSerializer):
    class Meta:
        model = Popup
        fields = (*DOCUMENT_FIELDS, "name", "type", "starts_at", "ends_at", "priority")


class CardIssueSerializer(AuditedSerializer):
    """A card made out to a member. ``design`` is the design's public id."""

    design = serializers.UUIDField(source="card_design.uuid", read_only=True)
    revoked_by = PersonField()

    class Meta:
        model = CardIssue
        fields = (
            *AUDIT_FIELDS,
            *("design", "design_version", "member_ref", "number", "data"),
            *("status", "delivery", "valid_until", "printed_at"),
            *("revoked_at", "revoked_by", "revoke_reason"),
        )


class PublicPopupSerializer(serializers.ModelSerializer):
    """A popup as your site gets it: PopupView draws the document, shouldShow decides."""

    id = serializers.UUIDField(source="uuid", read_only=True)

    class Meta:
        model = Popup
        fields = ("id", "version", "document")


class PublicArticleSerializer(serializers.ModelSerializer):
    """The published article, for your site: the live document and its card."""

    author = PersonField()

    class Meta:
        model = Article
        fields = (
            *("document", "published_at", "author"),
            *("title", "excerpt", "cover_key", "cover_alt"),  # copies of document.meta
        )


class ListItemSerializer(serializers.Serializer):
    """A row of your list. ``name`` is the column the kind lists by: an article's title."""

    id = serializers.UUIDField(source="uuid")
    name = serializers.SerializerMethodField()
    status = serializers.CharField()
    saved_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    updated_by = PersonField()
    deleted_at = serializers.DateTimeField()

    def get_name(self, row: Any) -> str:
        return str(getattr(row, self.context["name_column"]))


class WrittenSerializer(serializers.Serializer):
    """What the editor's host reads after a write: the new ``saved_at`` and where
    the document is now. Only an article has ``scheduled_at``."""

    saved_at = serializers.DateTimeField()
    status = serializers.CharField()
    published_at = serializers.DateTimeField()
    scheduled_at = serializers.DateTimeField(required=False)


class RevisionSerializer(serializers.Serializer):
    """A line of the editor's version list. ``author`` is a name: the editor shows it as is."""

    id = serializers.UUIDField(source="uuid")
    kind = serializers.CharField()
    label = serializers.CharField()
    version = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    author = serializers.SerializerMethodField()

    def get_author(self, revision: Revision) -> str | None:
        return name_of(revision.created_by) if revision.created_by else None


class ActivitySerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="uuid", read_only=True)
    actor = PersonField()

    class Meta:
        model = Activity
        fields = ("id", "action", "from_status", "to_status", "details", "actor", "created_at")


class SectionSerializer(serializers.ModelSerializer):
    """A saved section, as the editor lists and saves it."""

    id = serializers.UUIDField(source="uuid", read_only=True)

    class Meta:
        model = SavedSection
        fields = ("id", "name", "fragment")


class ResponseSerializer(AuditedSerializer):
    """A form response, for your inbox. Only ``status`` and ``note`` are written:
    the triage. The answers are what the visitor sent and stay so."""

    class Meta:
        model = FormResponse
        fields = (*AUDIT_FIELDS, "form_version", "answers", "locale", "status", "note", "ip")
        read_only_fields = ("form_version", "answers", "locale", "ip")


class MediaSerializer(serializers.ModelSerializer):
    """What the editor's ``upload`` reads: the key it stores and a URL to show it now."""

    url = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = ("key", "url", "width", "height", "mime", "size", "name")

    def get_url(self, media: Media) -> str:
        return default_storage.url(media.key)


class ItemsPagination(LimitOffsetPagination):
    """``?limit=&offset=``, answered as ``{ items, total }``."""

    default_limit = 50
    max_limit = 200

    def get_paginated_response(self, data: Any) -> Response:
        return Response({"items": data, "total": self.count})
