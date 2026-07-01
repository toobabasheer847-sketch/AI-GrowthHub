import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.user import User

if TYPE_CHECKING:
    from app.models.follow_up import FollowUp


class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    WON = "won"
    LOST = "lost"


class LeadSource(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    LINKEDIN = "linkedin"
    EMAIL = "email"
    ADS = "ads"
    OTHER = "other"


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[LeadStatus] = mapped_column(SqlEnum(LeadStatus, name="lead_status"), default=LeadStatus.NEW, nullable=False)
    source: Mapped[LeadSource] = mapped_column(SqlEnum(LeadSource, name="lead_source"), default=LeadSource.OTHER, nullable=False)
    assigned_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ai_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_score_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    assigned_user: Mapped[User] = relationship(back_populates="assigned_leads")
    follow_ups: Mapped[list["FollowUp"]] = relationship(back_populates="lead", cascade="all, delete-orphan")
