from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.authentication.dependencies import get_current_user
from app.authentication.security import decode_access_token
from app.database.session import SessionLocal, get_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.schemas.chat import (
    ChatUserResponse,
    ConversationCreateRequest,
    ConversationResponse,
    MessageCreateRequest,
    MessageResponse,
    ReadReceiptResponse,
)

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatConnectionManager:
    def __init__(self):
        self._connections: dict[UUID, set[WebSocket]] = {}

    async def connect(self, user_id: UUID, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(user_id, set()).add(websocket)

    def disconnect(self, user_id: UUID, websocket: WebSocket) -> bool:
        sockets = self._connections.get(user_id)
        if not sockets:
            return False

        sockets.discard(websocket)
        if sockets:
            return False

        self._connections.pop(user_id, None)
        return True

    def is_online(self, user_id: UUID) -> bool:
        return user_id in self._connections

    def online_user_ids(self) -> list[str]:
        return [str(user_id) for user_id in self._connections]

    async def send_to_user(self, user_id: UUID, payload: dict):
        for websocket in list(self._connections.get(user_id, set())):
            try:
                await websocket.send_json(payload)
            except Exception:
                continue

    async def send_to_users(self, user_ids: list[UUID], payload: dict):
        unique_user_ids = list(dict.fromkeys(user_ids))
        for user_id in unique_user_ids:
            await self.send_to_user(user_id, payload)

    async def send_to_all(self, payload: dict, exclude_user_id: UUID | None = None):
        for user_id in list(self._connections):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            await self.send_to_user(user_id, payload)


chat_manager = ChatConnectionManager()


def _make_pair_key(first_user_id: UUID, second_user_id: UUID) -> str:
    return ":".join(sorted([str(first_user_id), str(second_user_id)]))


def _normalize_message_body(body: str) -> str:
    normalized = body.strip()
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message body cannot be empty.")
    return normalized


def _build_chat_user(user: User) -> ChatUserResponse:
    return ChatUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        is_online=chat_manager.is_online(user.id),
    )


def _build_message_response(message: Message) -> MessageResponse:
    return MessageResponse.model_validate(message)


def _get_other_participant(conversation: Conversation, current_user_id: UUID) -> User:
    if conversation.participant_one_id == current_user_id:
        return conversation.participant_two
    return conversation.participant_one


def _base_conversation_query():
    return select(Conversation).options(
        selectinload(Conversation.participant_one),
        selectinload(Conversation.participant_two),
    )


def _get_conversation_or_404(db: Session, conversation_id: UUID, current_user_id: UUID) -> Conversation:
    conversation = db.execute(
        _base_conversation_query().where(
            Conversation.id == conversation_id,
            or_(
                Conversation.participant_one_id == current_user_id,
                Conversation.participant_two_id == current_user_id,
            ),
        )
    ).scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return conversation


def _get_last_message(db: Session, conversation_id: UUID) -> Message | None:
    return db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def _get_unread_count(db: Session, conversation_id: UUID, current_user_id: UUID) -> int:
    unread_count = db.execute(
        select(func.count(Message.id)).where(
            Message.conversation_id == conversation_id,
            Message.sender_id != current_user_id,
            Message.read_at.is_(None),
        )
    ).scalar_one()
    return int(unread_count or 0)


def _build_conversation_response(db: Session, conversation: Conversation, current_user_id: UUID) -> ConversationResponse:
    participant = _get_other_participant(conversation, current_user_id)
    last_message = _get_last_message(db, conversation.id)
    unread_count = _get_unread_count(db, conversation.id, current_user_id)
    return ConversationResponse(
        id=conversation.id,
        participant=_build_chat_user(participant),
        last_message=_build_message_response(last_message) if last_message else None,
        unread_count=unread_count,
        created_at=conversation.created_at,
    )


def _create_message(db: Session, conversation: Conversation, sender: User, body: str) -> Message:
    message = Message(
        conversation_id=conversation.id,
        sender_id=sender.id,
        body=_normalize_message_body(body),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def _mark_conversation_read(db: Session, conversation: Conversation, current_user: User) -> datetime | None:
    unread_messages = list(
        db.execute(
            select(Message).where(
                Message.conversation_id == conversation.id,
                Message.sender_id != current_user.id,
                Message.read_at.is_(None),
            )
        ).scalars().all()
    )
    if not unread_messages:
        return None

    read_at = datetime.now(timezone.utc)
    for message in unread_messages:
        message.read_at = read_at
        db.add(message)
    db.commit()
    return read_at


def _get_user_from_token(token: str, db: Session) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
    )

    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if not subject:
            raise credentials_error
        user_id = UUID(subject)
    except (ValueError, TypeError):
        raise credentials_error

    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if not user:
        raise credentials_error
    return user


def _get_websocket_token(websocket: WebSocket) -> str | None:
    authorization = websocket.headers.get("authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1]
    return websocket.query_params.get("token")


@router.get("/users", response_model=list[ChatUserResponse])
def list_chat_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = list(
        db.execute(select(User).where(User.id != current_user.id).order_by(User.name.asc(), User.email.asc())).scalars().all()
    )
    return [_build_chat_user(user) for user in users]


@router.get("/conversations", response_model=list[ConversationResponse])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conversations = list(
        db.execute(
            _base_conversation_query().where(
                or_(
                    Conversation.participant_one_id == current_user.id,
                    Conversation.participant_two_id == current_user.id,
                )
            )
        ).scalars().all()
    )
    items = [_build_conversation_response(db, conversation, current_user.id) for conversation in conversations]
    items.sort(
        key=lambda item: item.last_message.created_at if item.last_message else item.created_at,
        reverse=True,
    )
    return items


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_or_get_conversation(
    payload: ConversationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.participant_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot start a conversation with yourself.")

    participant = db.execute(select(User).where(User.id == payload.participant_id)).scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    pair_key = _make_pair_key(current_user.id, participant.id)
    conversation = db.execute(
        _base_conversation_query().where(Conversation.pair_key == pair_key)
    ).scalar_one_or_none()

    if not conversation:
        sorted_ids = sorted([current_user.id, participant.id], key=str)
        conversation = Conversation(
            participant_one_id=sorted_ids[0],
            participant_two_id=sorted_ids[1],
            pair_key=pair_key,
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    conversation = _get_conversation_or_404(db, conversation.id, current_user.id)
    return _build_conversation_response(db, conversation, current_user.id)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_conversation_or_404(db, conversation_id, current_user.id)
    messages = list(
        db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.asc())
        ).scalars().all()
    )
    return [_build_message_response(message) for message in messages]


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_message(
    conversation_id: UUID,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_conversation_or_404(db, conversation_id, current_user.id)
    message = _create_message(db, conversation, current_user, payload.body)
    return _build_message_response(message)


@router.post("/conversations/{conversation_id}/read", response_model=ReadReceiptResponse)
def mark_conversation_read(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_conversation_or_404(db, conversation_id, current_user.id)
    read_at = _mark_conversation_read(db, conversation, current_user)
    if not read_at:
        read_at = datetime.now(timezone.utc)

    return ReadReceiptResponse(conversation_id=conversation.id, read_at=read_at)


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket):
    db = SessionLocal()
    current_user: User | None = None

    try:
        token = _get_websocket_token(websocket)
        if not token:
            await websocket.close(code=1008)
            return

        try:
            current_user = _get_user_from_token(token, db)
        except HTTPException:
            await websocket.close(code=1008)
            return

        await chat_manager.connect(current_user.id, websocket)
        await websocket.send_json(
            {
                "type": "connection_ready",
                "user_id": str(current_user.id),
                "online_user_ids": chat_manager.online_user_ids(),
            }
        )
        await chat_manager.send_to_all(
            {
                "type": "presence",
                "user_id": str(current_user.id),
                "is_online": True,
            },
            exclude_user_id=current_user.id,
        )

        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if event_type == "send_message":
                conversation_id = data.get("conversation_id")
                body = data.get("body", "")
                if not conversation_id:
                    await websocket.send_json({"type": "error", "message": "conversation_id is required."})
                    continue

                try:
                    conversation = _get_conversation_or_404(db, UUID(conversation_id), current_user.id)
                    message = _create_message(db, conversation, current_user, body)
                except (HTTPException, ValueError) as exc:
                    message_text = exc.detail if isinstance(exc, HTTPException) else "Invalid conversation id."
                    await websocket.send_json({"type": "error", "message": message_text})
                    continue

                other_participant = _get_other_participant(conversation, current_user.id)
                await chat_manager.send_to_users(
                    [current_user.id, other_participant.id],
                    {
                        "type": "chat_message",
                        "conversation_id": str(conversation.id),
                        "message": _build_message_response(message).model_dump(mode="json"),
                    },
                )
                continue

            if event_type in {"typing_start", "typing_stop"}:
                conversation_id = data.get("conversation_id")
                if not conversation_id:
                    await websocket.send_json({"type": "error", "message": "conversation_id is required."})
                    continue

                try:
                    conversation = _get_conversation_or_404(db, UUID(conversation_id), current_user.id)
                except (HTTPException, ValueError):
                    await websocket.send_json({"type": "error", "message": "Conversation not found."})
                    continue

                other_participant = _get_other_participant(conversation, current_user.id)
                await chat_manager.send_to_user(
                    other_participant.id,
                    {
                        "type": "typing",
                        "conversation_id": str(conversation.id),
                        "user_id": str(current_user.id),
                        "is_typing": event_type == "typing_start",
                    },
                )
                continue

            if event_type == "mark_read":
                conversation_id = data.get("conversation_id")
                if not conversation_id:
                    await websocket.send_json({"type": "error", "message": "conversation_id is required."})
                    continue

                try:
                    conversation = _get_conversation_or_404(db, UUID(conversation_id), current_user.id)
                except (HTTPException, ValueError):
                    await websocket.send_json({"type": "error", "message": "Conversation not found."})
                    continue

                read_at = _mark_conversation_read(db, conversation, current_user)
                if read_at:
                    other_participant = _get_other_participant(conversation, current_user.id)
                    await chat_manager.send_to_users(
                        [current_user.id, other_participant.id],
                        {
                            "type": "messages_read",
                            "conversation_id": str(conversation.id),
                            "user_id": str(current_user.id),
                            "read_at": read_at.isoformat(),
                        },
                    )
                continue

            await websocket.send_json({"type": "error", "message": "Unsupported event type."})

    except WebSocketDisconnect:
        pass
    finally:
        if current_user:
            user_went_offline = chat_manager.disconnect(current_user.id, websocket)
            if user_went_offline:
                await chat_manager.send_to_all(
                    {
                        "type": "presence",
                        "user_id": str(current_user.id),
                        "is_online": False,
                    }
                )
        db.close()
