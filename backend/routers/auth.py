"""Registration, sign-in, sign-out, and the current-member lookup.

Authentication is required system functionality, but it is deliberately NOT
counted as one of the project's main Lost & Found features (spec section 4).
"""

import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import auth as auth_utils
import mailer
from database import get_db
from models import EmailVerification, User
from schemas import (
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    SimpleOk,
    UserOut,
    VerificationOut,
    VerifyCodeRequest,
    VerifyCodeResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _issue_and_send(db: Session, user: User) -> VerificationOut:
    """Create a fresh confirmation code and try to mail it.

    A failed send is reported, never raised: the account already exists, and the
    member can ask for another code from the confirmation screen.
    """
    code = auth_utils.issue_verification_code(db, user)
    sent = mailer.send_verification_code(
        user.email, user.name, code, auth_utils.CODE_TTL_MINUTES
    )
    is_production = os.getenv("UNIFIND_ENV", "development").lower() == "production"
    return VerificationOut(
        sent=sent,
        email=user.email,
        expires_in_minutes=auth_utils.CODE_TTL_MINUTES,
        # Returning the code is a development affordance only. In production this
        # would hand the code to anyone who could reach the endpoint.
        dev_code=None if is_production else code,
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, response: Response, db: Session = Depends(get_db)):
    """Create a UniFind account.

    The UIU domain rule is enforced by RegisterRequest before this runs, so a
    Gmail/Yahoo/Outlook address never reaches the database even if the React
    form was bypassed (spec sections 5 and 43).
    """
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account already exists for this UIU email. Try signing in instead.",
        )

    user = User(
        name=payload.name.strip(),
        email=payload.email,
        password_hash=auth_utils.hash_password(payload.password),
        department=(payload.department or "").strip() or None,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    verification = _issue_and_send(db, user)

    # The member is signed in immediately but unverified: they can look around,
    # while posting and claiming stay closed until they confirm (the soft gate).
    auth_utils.set_session_cookie(response, auth_utils.create_session_token(user))
    return RegisterResponse(
        **UserOut.model_validate(user).model_dump(), verification=verification
    )


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    # Same message for "no such account" and "wrong password" so the endpoint
    # cannot be used to discover which UIU emails are registered.
    if user is None or not auth_utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is suspended. Contact the UniFind administrators.",
        )

    user.last_signed_in = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    auth_utils.set_session_cookie(response, auth_utils.create_session_token(user))
    return user


@router.post("/logout", response_model=SimpleOk)
def logout(response: Response):
    auth_utils.clear_session_cookie(response)
    return SimpleOk()


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(auth_utils.get_current_user)):
    return user


@router.post("/verify", response_model=VerifyCodeResponse)
def verify_email(
    payload: VerifyCodeRequest,
    user: User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Confirm the member's UIU address with the six-digit code that was mailed.

    The code is checked against the signed-in member, so this endpoint cannot be
    used to work on somebody else's account.
    """
    # Idempotent: mail clients prefetch, and people submit twice.
    if user.is_verified:
        return VerifyCodeResponse(
            user=UserOut.model_validate(user), message="Your UIU email is already confirmed."
        )

    row = auth_utils.latest_verification(db, user.id)
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="That code has expired. Request a new one.",
        )

    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        # SQLite returns naive datetimes; the stored value is always UTC.
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expires_at:
        db.delete(row)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="That code has expired. Request a new one.",
        )

    if row.attempts >= auth_utils.MAX_CODE_ATTEMPTS:
        db.delete(row)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )

    if not auth_utils.verify_password(payload.code, row.code_hash):
        # Counting the attempt before returning is the whole point of the cap —
        # six digits is a million guesses, which is nothing without this.
        row.attempts += 1
        db.commit()
        remaining = auth_utils.MAX_CODE_ATTEMPTS - row.attempts
        detail = (
            f"That code is not correct. {remaining} attempt{'s' if remaining != 1 else ''} left."
            if remaining > 0
            else "Too many incorrect attempts. Request a new code."
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    user.is_verified = True
    user.verified_at = datetime.now(timezone.utc)
    # The code has done its job; leaving it around only widens the window.
    db.query(EmailVerification).filter(EmailVerification.user_id == user.id).delete(
        synchronize_session=False
    )
    db.commit()
    db.refresh(user)

    return VerifyCodeResponse(
        user=UserOut.model_validate(user),
        message="Your UIU email is confirmed. Everything is unlocked.",
    )


@router.post("/resend", response_model=VerificationOut)
def resend_verification(
    user: User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    """Send a fresh confirmation code, at most once a minute."""
    if user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your UIU email is already confirmed.",
        )

    wait = auth_utils.seconds_until_resend_allowed(auth_utils.latest_verification(db, user.id))
    if wait > 0:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {wait} more second{'s' if wait != 1 else ''} before asking again.",
        )

    return _issue_and_send(db, user)
