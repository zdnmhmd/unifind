"""Registration, sign-in, sign-out, and the current-member lookup.

Authentication is required system functionality, but it is deliberately NOT
counted as one of the project's main Lost & Found features (spec section 4).
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import auth as auth_utils
from database import get_db
from models import User
from schemas import LoginRequest, RegisterRequest, SimpleOk, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
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

    auth_utils.set_session_cookie(response, auth_utils.create_session_token(user))
    return user


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
