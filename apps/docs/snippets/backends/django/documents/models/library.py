"""The library every builder shares: pieces of documents saved to reuse, and
every uploaded file."""

from django.db import models
from django.db.models import Q

from .base import LIVE, AuditedModel, one_of


class Kit(models.TextChoices):
    """Which builder a saved section belongs to."""

    EMAIL = "email"
    ARTICLE = "article"
    FORM = "form"


class SavedSection(AuditedModel):
    """An email header, an article's call to action. Deleting one hides it from
    the editor's list; the documents that used it keep their copy."""

    kit = models.CharField(max_length=16, choices=Kit)
    #: What the editor lists it as.
    name = models.CharField(max_length=120)
    #: The piece of a document the editor hands over: ``{ roots, nodes }``.
    fragment = models.JSONField()
    #: An email section kept in step everywhere it is used.
    synced = models.BooleanField(default=False, db_default=False)

    class Meta:
        db_table = "saved_section"
        constraints = [one_of("kit", Kit, table="saved_section")]
        indexes = [
            models.Index(fields=["kit", "name"], condition=LIVE, name="saved_section_by_kit")
        ]


class MediaKind(models.TextChoices):
    """What the editor offers a file for."""

    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"


class Media(AuditedModel):
    """Every uploaded file, by the key the documents store. A document holds the
    key, never a URL: the URL is built when it is shown, so a CDN can move in
    front. ``created_by`` is who uploaded it."""

    #: Where the bytes are in your storage: 2026/11/3f9c….png
    key = models.CharField(max_length=300)
    kind = models.CharField(max_length=8, choices=MediaKind)
    #: Checked by the file's first bytes, not by its name.
    mime = models.CharField(max_length=100)
    #: Bytes.
    size = models.IntegerField()
    #: Images and video.
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    #: The name it was uploaded with.
    name = models.CharField(max_length=300)
    #: The default alt text.
    alt = models.CharField(max_length=300, blank=True, default="", db_default="")
    #: The same file uploaded twice becomes one row.
    sha256 = models.CharField(max_length=64)

    class Meta:
        db_table = "media"
        verbose_name_plural = "media"
        constraints = [
            # A constraint, not unique=True: that would add a second index for LIKE.
            models.UniqueConstraint(fields=["key"], name="media_key_key"),
            one_of("kind", MediaKind, table="media"),
            models.CheckConstraint(condition=Q(size__gt=0), name="media_size_check"),
        ]
        indexes = [
            models.Index(fields=["kind", "-created_at"], condition=LIVE, name="media_library"),
            models.Index(fields=["sha256"], name="media_by_hash"),
        ]
