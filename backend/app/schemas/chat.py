from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ChatUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    is_online: bool = False


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime
    read_at: datetime | None = None


class ConversationResponse(BaseModel):
    id: UUID
    participant: ChatUserResponse
    last_message: MessageResponse | None = None
    unread_count: int = 0
    created_at: datetime


class ConversationCreateRequest(BaseModel):
    participant_id: UUID


class MessageCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def normalize_body(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message body cannot be empty.")
        return normalized


class ReadReceiptResponse(BaseModel):
    conversation_id: UUID
    read_at: datetime
