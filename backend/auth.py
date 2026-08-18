"""Password hashing, JWT sessions, and the route guards (spec section 43).

The session token is issued as an httpOnly cookie. That keeps it out of reach of
any JavaScript running on the page, so a cross-site scripting bug cannot read a
member's session. The React app never sees or stores the token — it just sends
credentials with each request.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import is_uiu_email, UIU_EMAIL_ERROR

SESSION_COOKIE = "unifind_session"

# A real deployment must set UNIFIND_SECRET_KEY. The development fallback keeps
# `uvicorn main:app --reload` working out of the box for local demos.
SECRET_KEY = os.getenv("UNIFIND_SECRET_KEY", "unifind-development-secret-change-me")
ALGORITHM = "HS256"
SESSION_DAYS = 7

# Cookies are only marked Secure in production; over plain http://localhost a
# Secure cookie would simply be dropped by the browser.
IS_PRODUCTION = os.getenv("UNIFIND_ENV", "development").lower() == "production"


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hash with bcrypt. Plain-text passwords are never stored (spec section 43)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in the database — treat as a failed login, never a 500.
        return False


# ---------------------------------------------------------------------------
# Tokens
# ---------------------------------------------------------------------------
def create_session_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + timedelta(days=SESSION_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def set_session_cookie(response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=IS_PRODUCTION,
        max_age=SESSION_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


# ---------------------------------------------------------------------------
# Route guards
# ---------------------------------------------------------------------------
_UNAUTHENTICATED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Please sign in with your UIU account to continue.",
)


def get_current_user(
    unifind_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    """Require a signed-in member. Used by every protected route."""
    if not unifind_session:
        raise _UNAUTHENTICATED

    try:
        payload = jwt.decode(unifind_session, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise _UNAUTHENTICATED

    user_id = payload.get("sub")
    if not user_id:
        raise _UNAUTHENTICATED

    user = db.get(User, int(user_id))
    if user is None:
        raise _UNAUTHENTICATED

    # Re-check the domain on every request. A token is not a substitute for the
    # rule — if an account's email ever stops qualifying, access stops with it.
    if not is_uiu_email(user.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=UIU_EMAIL_ERROR)

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is suspended. Contact the UniFind administrators.",
        )

    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """Require an administrator (spec section 27–28)."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This area is limited to UniFind administrators.",
        )
    return user


def get_optional_user(
    unifind_session: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User | None:
    """Best-effort lookup for routes that behave differently when signed in."""
    if not unifind_session:
        return None
    try:
        return get_current_user(unifind_session=unifind_session, db=db)
    except HTTPException:
        return None
