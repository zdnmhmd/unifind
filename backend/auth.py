"""Password hashing, JWT sessions, and the route guards (spec section 43).

The session token is issued as an httpOnly cookie. That keeps it out of reach of
any JavaScript running on the page, so a cross-site scripting bug cannot read a
member's session. The React app never sees or stores the token — it just sends
credentials with each request.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import EmailVerification, User
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

# Email confirmation (spec section 5).
CODE_TTL_MINUTES = 10
MAX_CODE_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60


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


# ---------------------------------------------------------------------------
# Email confirmation codes (spec section 5)
# ---------------------------------------------------------------------------
def generate_verification_code() -> str:
    """Six digits from a cryptographic source.

    random.randint would be wrong here: it is a Mersenne Twister seeded from the
    clock, so observing a couple of codes is enough to predict the rest.
    """
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_verification_code(db: Session, user: User) -> str:
    """Replace any outstanding code for this member and return the new plain code.

    Only the bcrypt hash is stored, so the plain code exists just long enough to
    be handed to the mailer.
    """
    db.query(EmailVerification).filter(EmailVerification.user_id == user.id).delete(
        synchronize_session=False
    )

    code = generate_verification_code()
    db.add(
        EmailVerification(
            user_id=user.id,
            code_hash=hash_password(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES),
        )
    )
    db.commit()
    return code


def latest_verification(db: Session, user_id: int) -> EmailVerification | None:
    return (
        db.query(EmailVerification)
        .filter(EmailVerification.user_id == user_id)
        .order_by(EmailVerification.created_at.desc())
        .first()
    )


def seconds_until_resend_allowed(row: EmailVerification | None) -> int:
    """How long the member must wait before another code can be sent.

    Without this the resend endpoint is a free way to mail-bomb any UIU address.
    """
    if row is None:
        return 0
    issued = row.created_at
    if issued.tzinfo is None:
        # SQLite hands back naive datetimes; the stored value is always UTC.
        issued = issued.replace(tzinfo=timezone.utc)
    elapsed = (datetime.now(timezone.utc) - issued).total_seconds()
    return max(0, int(RESEND_COOLDOWN_SECONDS - elapsed))


def get_verified_user(user: User = Depends(get_current_user)) -> User:
    """Require a confirmed UIU email.

    The soft gate: reading UniFind only needs a session, but anything that
    creates content for other members to act on needs a confirmed address.
    """
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Confirm your UIU email before posting. Check your inbox for the code.",
        )
    return user
