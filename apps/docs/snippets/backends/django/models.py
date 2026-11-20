"""The data model's tables as Django models, in an app called ``documents``:
the table and column names of schema.sql. ``manage.py makemigrations`` writes
the migration from them."""

from django.conf import settings
from django.db import models
from django.db.models import CheckConstraint, Index, Q, UniqueConstraint


def author(column: str) -> models.ForeignKey:
    """A user column, named as in the schema (``created_by``, not ``created_by_id``)."""
    return models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        db_column=column,
        related_name="+",
    )


class DocumentRow(models.Model):
    """What every document row has: the live document, the draft since, and
    ``saved_at``, which changes on every write."""

    id = models.BigAutoField(primary_key=True)
    #: The live document: what readers get, what is sent, what the form shows.
    document = models.JSONField()
    #: Work in progress since the last publish; None when there is none.
    draft_document = models.JSONField(null=True, blank=True)
    saved_at = models.DateTimeField()
    #: Counts publishes.
    version = models.IntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class EmailTemplate(DocumentRow):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"

    name = models.CharField(max_length=120)
    #: The email type it is for (password_reset, newsletter): its variables.
    type_key = models.CharField(max_length=60, null=True, blank=True)
    status = models.TextField(choices=Status, default=Status.DRAFT)
    created_by = author("created_by")

    class Meta:
        db_table = "email_template"
        # Publishing is its own permission, beside Django's add/change/view.
        permissions = [("publish_emailtemplate", "Can publish email templates")]
        constraints = [
            CheckConstraint(
                condition=Q(status__in=["draft", "published"]), name="email_template_status"
            ),
            # One active design per email type: the one the mailer sends.
            UniqueConstraint(
                fields=["type_key"],
                condition=Q(status="published"),
                name="email_template_active_type",
            ),
        ]


class Article(DocumentRow):
    class Status(models.TextChoices):
        DRAFT = "draft"
        SCHEDULED = "scheduled"
        PUBLISHED = "published"
        ARCHIVED = "archived"

    slug = models.CharField(max_length=200)
    #: The language the article's tree is written in.
    locale = models.CharField(max_length=10)
    status = models.TextField(choices=Status, default=Status.DRAFT)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    # Copies of document.meta, written with the document, for lists and search.
    title = models.CharField(max_length=300, default="", blank=True)
    excerpt = models.CharField(max_length=600, default="", blank=True)
    cover_key = models.CharField(max_length=300, null=True, blank=True)
    cover_alt = models.CharField(max_length=300, null=True, blank=True)
    author = author("author_id")

    class Meta:
        db_table = "article"
        permissions = [("publish_article", "Can publish articles")]
        constraints = [
            CheckConstraint(
                condition=Q(status__in=["draft", "scheduled", "published", "archived"]),
                name="article_status",
            ),
            UniqueConstraint(fields=["slug", "locale"], name="article_slug_locale"),
        ]
        indexes = [
            Index(
                fields=["locale", "-published_at"],
                name="article_published",
                condition=Q(status="published"),
            ),
            # A job publishes these when their time comes.
            Index(fields=["scheduled_at"], name="article_due", condition=Q(status="scheduled")),
        ]


class Form(DocumentRow):
    class Status(models.TextChoices):
        DRAFT = "draft"
        PUBLISHED = "published"
        #: Keeps the link but shows the form's closed message.
        CLOSED = "closed"

    #: Its public address: example.com/f/<slug>. A copy of document.meta.slug.
    slug = models.CharField(max_length=80, unique=True)
    name = models.CharField(max_length=120, default="", blank=True)
    status = models.TextField(choices=Status, default=Status.DRAFT)
    #: Kept by the response route, for the list and maxResponses.
    response_count = models.IntegerField(default=0)
    created_by = author("created_by")

    class Meta:
        db_table = "form"
        permissions = [("publish_form", "Can publish forms")]
        constraints = [
            CheckConstraint(
                condition=Q(status__in=["draft", "published", "closed"]), name="form_status"
            ),
        ]


class FormResponse(models.Model):
    """One row per submission: the answers ``validate_answers`` kept, never the raw body."""

    id = models.BigAutoField(primary_key=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name="responses")
    #: The version answered: a later edit to the form does not change what it asked.
    form_version = models.IntegerField()
    answers = models.JSONField()
    locale = models.CharField(max_length=10, null=True, blank=True)
    #: Your team's own triage: new, called, done.
    status = models.CharField(max_length=30, default="new")
    #: Only when the form's settings.privacy.storeIp is on. inet in Postgres.
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "form_response"
        indexes = [Index(fields=["form", "-created_at"], name="form_response_latest")]


class Revision(models.Model):
    """A version to go back to: every manual save and publish, and a few autosaves."""

    class DocumentKind(models.TextChoices):
        EMAIL = "email"
        ARTICLE = "article"
        FORM = "form"

    class Kind(models.TextChoices):
        AUTOSAVE = "autosave"
        MANUAL = "manual"
        PUBLISH = "publish"

    id = models.BigAutoField(primary_key=True)
    document_kind = models.TextField(choices=DocumentKind)
    document_id = models.BigIntegerField()
    kind = models.TextField(choices=Kind)
    label = models.CharField(max_length=120, null=True, blank=True)
    document = models.JSONField()
    author = author("author_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "revision"
        indexes = [
            Index(fields=["document_kind", "document_id", "-created_at"], name="revision_history")
        ]


class SavedSection(models.Model):
    """A piece of a document saved to reuse: an email header, an article's call to action."""

    id = models.BigAutoField(primary_key=True)
    kit = models.TextField(choices=Revision.DocumentKind)
    name = models.CharField(max_length=120)
    fragment = models.JSONField()
    #: An email section kept in step everywhere it is used.
    synced = models.BooleanField(default=False)
    created_by = author("created_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_section"


class Media(models.Model):
    """Every uploaded file, by the key the documents store."""

    class Kind(models.TextChoices):
        IMAGE = "image"
        VIDEO = "video"
        AUDIO = "audio"
        FILE = "file"

    key = models.CharField(max_length=300, primary_key=True)
    kind = models.TextField(choices=Kind)
    mime = models.CharField(max_length=100)
    size = models.IntegerField()
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    name = models.CharField(max_length=300)
    owner = author("owner_id")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "media"
