"""What a route can ask for: the session, and who is signed in."""

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.db import get_session
from app.errors import SignInRequiredError
from app.models import User

SessionDep = Annotated[Session, Depends(get_session)]


# ── Your auth here ──────────────────────────────────────────────────────────
# A stand-in: your auth middleware (a session cookie, a JWT) puts the signed-in
# user's id on request.state.user_id. Replace it with yours, and add who may
# edit and who may publish: publishing is a different trust from a draft.
def signed_in(request: Request, db: SessionDep) -> User | None:
    user_id: int | None = getattr(request.state, "user_id", None)
    return db.get(User, user_id) if user_id is not None else None


def current_user(user: Annotated[User | None, Depends(signed_in)]) -> User:
    if user is None:
        raise SignInRequiredError("Sign in to edit.")
    return user


#: Whoever is signed in, or None: a visitor sending a form.
Visitor = Annotated[User | None, Depends(signed_in)]
#: The signed-in user every write is stamped with.
CurrentUser = Annotated[User, Depends(current_user)]
