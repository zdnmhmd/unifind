"""Smart Matching results (spec section 11) — UniFind's standout feature.

The scoring itself lives in matching.py. This router only reads back the cached
pairs that involve the current member's own posts.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from helpers import serialize_item
from matching import decode_reasons
from models import Item, ItemMatch, User
from schemas import MatchOut

router = APIRouter(prefix="/api/matches", tags=["matches"])


@router.get("", response_model=list[MatchOut])
def list_matches(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Every possible match touching one of the member's own reports."""
    own_ids = {
        item_id
        for (item_id,) in db.query(Item.id).filter(
            Item.owner_id == user.id, Item.is_removed.is_(False)
        )
    }
    if not own_ids:
        return []

    pairs = (
        db.query(ItemMatch)
        .filter(
            ItemMatch.item_a_id.in_(own_ids) | ItemMatch.item_b_id.in_(own_ids)
        )
        .order_by(ItemMatch.score.desc())
        .all()
    )

    results: list[dict] = []
    for pair in pairs:
        own_id, matched_id = (
            (pair.item_a_id, pair.item_b_id)
            if pair.item_a_id in own_ids
            else (pair.item_b_id, pair.item_a_id)
        )
        own_item = db.get(Item, own_id)
        matched_item = db.get(Item, matched_id)

        # A match whose counterpart has since been withdrawn is not a lead.
        if own_item is None or matched_item is None or matched_item.is_removed:
            continue

        results.append(
            {
                "id": pair.id,
                "score": pair.score,
                "reasons": decode_reasons(pair.reasons),
                "own_item": serialize_item(db, own_item, user.id),
                "matched_item": serialize_item(db, matched_item, user.id),
            }
        )

    return results
