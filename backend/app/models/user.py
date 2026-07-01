import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.conversation import Conversation
from app.models.knowledge_document import KnowledgeDocument

if TYPE_CHECKING:
    from app.models.knowledge_document import KnowledgeDocument
    from app.models.lead import Lead
    from app.models.message import Message


class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole, name="user_role"), default=UserRole.VIEWER, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    assigned_leads: Mapped[list["Lead"]] = relationship(back_populates="assigned_user")
    knowledge_documents: Mapped[list[KnowledgeDocument]] = relationship(back_populates="created_by")
    conversations_as_participant_one: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        foreign_keys="Conversation.participant_one_id",
        back_populates="participant_one",
    )
    conversations_as_participant_two: Mapped[list["Conversation"]] = relationship(
        "Conversation",
        foreign_keys="Conversation.participant_two_id",
        back_populates="participant_two",
    )
    messages: Mapped[list["Message"]] = relationship(back_populates="sender")
