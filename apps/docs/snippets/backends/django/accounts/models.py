"""Your users, with the one thing the data model asks of them: a public
``uuid``, so an answer names a person without showing an internal id.

Set ``AUTH_USER_MODEL = "accounts.User"`` before the first migration."""

import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
