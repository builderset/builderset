"""What the routes ask FastAPI for: the session, the signed-in user, the template."""

from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import NotFoundError
from app.models import AppUser, EmailTemplate

Db = Annotated[Session, Depends(get_session)]


# ── Your auth here ───────────────────────────────────────────────────────────
# Every write is stamped with the signed-in user. So that the example runs on
# its own, this stand-in signs everyone in as one example editor. Replace it
# with a dependency that returns your signed-in user from your session or
# token, and answers 401 when there is none.
STAND_IN_EMAIL = "editor@example.com"
STAND_IN_NAME = "Example Editor"


def current_user(db: Db) -> AppUser:
    db.execute(
        insert(AppUser)
        .values(email=STAND_IN_EMAIL, name=STAND_IN_NAME)
        .on_conflict_do_nothing(index_elements=[AppUser.email])
    )
    return db.scalars(select(AppUser).where(AppUser.email == STAND_IN_EMAIL)).one()


# ─────────────────────────────────────────────────────────────────────────────

CurrentUser = Annotated[AppUser, Depends(current_user)]


def find_email(
    db: Session, email_id: UUID, *, deleted: bool = False, for_update: bool = False
) -> EmailTemplate:
    """The template by its public id: a live one, or with ``deleted`` one in the
    trash. ``for_update`` locks the row until the transaction ends."""
    in_trash = EmailTemplate.deleted_at.is_not(None)
    query = select(EmailTemplate).where(
        EmailTemplate.uuid == email_id, in_trash if deleted else EmailTemplate.live()
    )
    template = db.scalars(query.with_for_update() if for_update else query).one_or_none()
    if template is None:
        raise NotFoundError("There is no such email template.")
    return template


def live_email(email_id: UUID, db: Db) -> EmailTemplate:
    # A deleted template answers 404 everywhere but restore.
    return find_email(db, email_id)


LiveEmail = Annotated[EmailTemplate, Depends(live_email)]
