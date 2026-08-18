"""FEATURE 3 — claiming and status tracking (spec section 10).

The case flow this drives:
    OPEN -> Claim Submitted -> PENDING -> Verified -> RESOLVED
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user, get_verified_user
from database import get_db
from helpers import create_notification, serialize_item
from models import Claim, Item, User
from schemas import ClaimCreate, ClaimOut, ClaimReview
from routers.items import _get_item_or_404

router = APIRouter(tags=["claims"])


def _serialize_claim(db: Session, claim: Claim, item: Item, viewer_id: int) -> dict:
    claimant = db.get(User, claim.claimant_id)
    return {
        "id": claim.id,
        "item_id": claim.item_id,
        "claimant_id": claim.claimant_id,
        "claimant_name": claimant.name if claimant else "Verified UIU member",
        "verification_message": claim.verification_message,
        "status": claim.status,
        "direction": "sent" if claim.claimant_id == viewer_id else "received",
        "item": serialize_item(db, item, viewer_id),
        "created_at": claim.created_at,
    }


@router.post(
    "/api/items/{item_id}/claims",
    response_model=ClaimOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_claim(
    item_id: int,
    payload: ClaimCreate,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    """Submit an ownership claim with a short verification message."""
    item = _get_item_or_404(db, item_id)

    if item.owner_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot claim your own post.",
        )
    if item.status == "resolved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This case has already been resolved.",
        )
    if item.is_removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This item report no longer exists.",
        )

    existing = (
        db.query(Claim)
        .filter(Claim.item_id == item.id, Claim.claimant_id == user.id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already submitted a claim for this item.",
        )

    claim = Claim(
        item_id=item.id,
        claimant_id=user.id,
        verification_message=payload.verification_message,
    )
    db.add(claim)

    # A claim moves the case from OPEN to PENDING.
    if item.status == "open":
        item.status = "pending"

    create_notification(
        db,
        user_id=item.owner_id,
        type="claim",
        title="New ownership claim",
        body=f"Someone submitted a claim for {item.title}.",
        href="/claims",
    )
    db.commit()
    db.refresh(claim)
    db.refresh(item)

    return _serialize_claim(db, claim, item, user.id)


@router.get("/api/claims", response_model=list[ClaimOut])
def list_claims(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Claims the member submitted, plus claims received on their own posts."""
    rows = (
        db.query(Claim, Item)
        .join(Item, Claim.item_id == Item.id)
        .filter((Claim.claimant_id == user.id) | (Item.owner_id == user.id))
        .order_by(Claim.created_at.desc())
        .all()
    )
    return [_serialize_claim(db, claim, item, user.id) for claim, item in rows]


@router.patch("/api/claims/{claim_id}", response_model=ClaimOut)
def review_claim(
    claim_id: int,
    payload: ClaimReview,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a claim. Only the member who posted the item may decide."""
    claim = db.get(Claim, claim_id)
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This claim no longer exists.",
        )

    item = _get_item_or_404(db, claim.item_id)
    if item.owner_id != user.id and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the member who posted this item can review its claims.",
        )

    claim.status = payload.status

    # Rejecting the last outstanding claim returns the case to OPEN so the item
    # keeps appearing as available in Browse.
    if payload.status == "rejected":
        still_open = (
            db.query(Claim)
            .filter(
                Claim.item_id == item.id,
                Claim.id != claim.id,
                Claim.status == "submitted",
            )
            .count()
        )
        if still_open == 0 and item.status == "pending":
            item.status = "open"

    create_notification(
        db,
        user_id=claim.claimant_id,
        type="claim",
        title=f"Claim {payload.status}",
        body=f"{item.title}: your claim was {payload.status}.",
        href="/claims",
    )
    db.commit()
    db.refresh(claim)
    db.refresh(item)

    return _serialize_claim(db, claim, item, user.id)
