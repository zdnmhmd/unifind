"""FEATURE 3 — claiming and status tracking (spec section 10).

The case flow this drives:
    OPEN -> Claim Submitted -> PENDING -> Verified -> RESOLVED
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user, get_verified_user
from database import get_db
from helpers import create_notification, serialize_item
from models import Claim, ClaimDecision, Item, User
from schemas import ClaimCreate, ClaimOut, ClaimReview
from routers.items import _get_item_or_404

router = APIRouter(tags=["claims"])

# The only transition a claim has. "submitted" is where every claim starts, and
# approved/rejected are both final — a decision a student can see is a decision
# that must not quietly change afterwards.
FINAL_CLAIM_STATUSES = ("approved", "rejected")


def _record_decision(
    db: Session,
    claim: Claim,
    *,
    from_status: str,
    to_status: str,
    actor_id: int | None,
    actor_role: str,
    reason: str | None,
) -> None:
    """Write one audit row. Added to the session, committed by the caller.

    Sharing the caller's transaction is the point: a decision that was applied
    but not recorded would be exactly the case the audit exists to answer.
    """
    db.add(
        ClaimDecision(
            claim_id=claim.id,
            actor_id=actor_id,
            from_status=from_status,
            to_status=to_status,
            actor_role=actor_role,
            reason=reason,
        )
    )


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
    is_admin = user.role == "admin"
    if item.owner_id != user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the member who posted this item can review its claims.",
        )

    # A decision is final. Without this the same claim could be approved, then
    # rejected, then approved again — and two rival claimants could each be
    # holding an approval on the same item.
    if claim.status in FINAL_CLAIM_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"This claim was already {claim.status} and cannot be changed. "
                "Contact the UniFind administrators if that decision was a mistake."
            ),
        )

    previous = claim.status
    actor_role = "admin" if is_admin and item.owner_id != user.id else "owner"

    if payload.status == "approved":
        # Belt and braces against two reviews arriving at once: the competing
        # claims are closed below, but a concurrent request could have got there
        # first, and one item must never carry two approvals.
        rival_approved = (
            db.query(Claim)
            .filter(
                Claim.item_id == item.id,
                Claim.id != claim.id,
                Claim.status == "approved",
            )
            .first()
        )
        if rival_approved is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Another claim on this item has already been approved.",
            )

    claim.status = payload.status
    _record_decision(
        db,
        claim,
        from_status=previous,
        to_status=payload.status,
        actor_id=user.id,
        actor_role=actor_role,
        reason=payload.reason,
    )

    create_notification(
        db,
        user_id=claim.claimant_id,
        type="claim",
        title=f"Claim {payload.status}",
        body=f"{item.title}: your claim was {payload.status}.",
        href="/claims",
    )

    if payload.status == "approved":
        # Approving one claim settles the question for everyone else waiting on
        # this item. Leaving them "submitted" would keep them hoping, and would
        # let a second approval happen later.
        competing = (
            db.query(Claim)
            .filter(
                Claim.item_id == item.id,
                Claim.id != claim.id,
                Claim.status == "submitted",
            )
            .all()
        )
        for other in competing:
            other.status = "rejected"
            _record_decision(
                db,
                other,
                from_status="submitted",
                to_status="rejected",
                actor_id=user.id,
                actor_role=actor_role,
                reason="Closed automatically: another claim on this item was approved.",
            )
            create_notification(
                db,
                user_id=other.claimant_id,
                type="claim",
                title="Claim closed",
                body=f"{item.title}: another member's claim was approved.",
                href="/claims",
            )
    else:
        # Rejecting the last outstanding claim returns the case to OPEN so the
        # item keeps appearing as available in Browse.
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

    # One commit for the decision, the competing claims, the audit rows and the
    # notifications together — a half-applied approval is the worst outcome here.
    db.commit()
    db.refresh(claim)
    db.refresh(item)

    return _serialize_claim(db, claim, item, user.id)
