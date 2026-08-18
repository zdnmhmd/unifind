"""Private messaging tied to a listing or claim (spec section 13).

Messages are stored normally in SQLite — real-time WebSockets are explicitly not
required for this project.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import get_current_user, get_verified_user
from database import get_db
from helpers import create_notification, serialize_item
from models import Conversation, Item, Message, User, utcnow
from routers.items import _get_item_or_404
from schemas import (
    ConversationDetail,
    ConversationOut,
    ConversationStart,
    MessageCreate,
    MessageOut,
)

router = APIRouter(prefix="/api/conversations", tags=["messages"])


def _other_participant(conversation: Conversation, viewer_id: int) -> int:
    return (
        conversation.participant_two_id
        if conversation.participant_one_id == viewer_id
        else conversation.participant_one_id
    )


def _require_participant(conversation: Conversation, user: User) -> None:
    if user.id not in (conversation.participant_one_id, conversation.participant_two_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this conversation.",
        )


def _serialize_message(db: Session, message: Message) -> dict:
    sender = db.get(User, message.sender_id)
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "sender_name": sender.name if sender else "Verified UIU member",
        "body": message.body,
        "created_at": message.created_at,
    }


@router.get("", response_model=list[ConversationOut])
def list_conversations(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Inbox rows: other member, related item, latest message, time."""
    conversations = (
        db.query(Conversation)
        .filter(
            (Conversation.participant_one_id == user.id)
            | (Conversation.participant_two_id == user.id)
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    rows: list[dict] = []
    for conversation in conversations:
        item = db.get(Item, conversation.item_id)
        if item is None:
            continue
        other_id = _other_participant(conversation, user.id)
        other = db.get(User, other_id)
        last = (
            db.query(Message)
            .filter(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        rows.append(
            {
                "id": conversation.id,
                "item": serialize_item(db, item, user.id),
                "other_participant_id": other_id,
                "other_participant_name": other.name if other else "Verified UIU member",
                "last_message": _serialize_message(db, last) if last else None,
                "updated_at": conversation.updated_at,
            }
        )
    return rows


@router.post("", response_model=ConversationDetail, status_code=status.HTTP_201_CREATED)
def start_conversation(
    payload: ConversationStart,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    """Open (or reuse) the conversation between two members about one item."""
    item = _get_item_or_404(db, payload.item_id)

    # Messaging a poster needs no recipient; the poster replying to a claimant
    # names the member they are answering.
    other_id = payload.recipient_id if item.owner_id == user.id else item.owner_id
    if not other_id or other_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose another verified member for this conversation.",
        )
    if db.get(User, other_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That member no longer has a UniFind account.",
        )

    existing = (
        db.query(Conversation)
        .filter(
            Conversation.item_id == item.id,
            (
                (Conversation.participant_one_id == user.id)
                & (Conversation.participant_two_id == other_id)
            )
            | (
                (Conversation.participant_one_id == other_id)
                & (Conversation.participant_two_id == user.id)
            ),
        )
        .first()
    )
    if existing:
        return get_conversation(existing.id, user=user, db=db)

    conversation = Conversation(
        item_id=item.id,
        claim_id=payload.claim_id,
        participant_one_id=user.id,
        participant_two_id=other_id,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    create_notification(
        db,
        user_id=other_id,
        type="message",
        title="New item conversation",
        body=f"A verified member started a conversation about {item.title}.",
        href=f"/messages/{conversation.id}",
    )
    db.commit()

    return get_conversation(conversation.id, user=user, db=db)


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This conversation no longer exists.",
        )
    _require_participant(conversation, user)

    item = _get_item_or_404(db, conversation.item_id)
    other_id = _other_participant(conversation, user.id)
    other = db.get(User, other_id)
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "id": conversation.id,
        "item": serialize_item(db, item, user.id),
        "other_participant_id": other_id,
        "other_participant_name": other.name if other else "Verified UIU member",
        "messages": [_serialize_message(db, message) for message in messages],
    }


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    user: User = Depends(get_verified_user),
    db: Session = Depends(get_db),
):
    conversation = db.get(Conversation, conversation_id)
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This conversation no longer exists.",
        )
    _require_participant(conversation, user)

    message = Message(conversation_id=conversation.id, sender_id=user.id, body=payload.body)
    db.add(message)

    # Bump the conversation so the inbox stays ordered by latest activity.
    conversation.updated_at = utcnow()

    create_notification(
        db,
        user_id=_other_participant(conversation, user.id),
        type="message",
        title="New message",
        body="You have a new item-related message.",
        href=f"/messages/{conversation.id}",
    )
    db.commit()
    db.refresh(message)

    return _serialize_message(db, message)
