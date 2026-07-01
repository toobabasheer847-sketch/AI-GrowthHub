from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.lead import LeadSource, LeadStatus


class AssignedUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: EmailStr


class LeadBase(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=50)
    company: str = Field(min_length=2, max_length=255)
    status: LeadStatus = LeadStatus.NEW
    source: LeadSource = LeadSource.OTHER

    @field_validator("name", "company")
    @classmethod
    def normalize_text_fields(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        return value.strip()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LeadCreate(LeadBase):
    assigned_user_id: UUID | None = None


class LeadUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=7, max_length=50)
    company: str | None = Field(default=None, min_length=2, max_length=255)
    status: LeadStatus | None = None
    source: LeadSource | None = None
    assigned_user_id: UUID | None = None

    @field_validator("name", "company")
    @classmethod
    def normalize_optional_text_fields(cls, value: str | None) -> str | None:
        return " ".join(value.split()) if value else value

    @field_validator("phone")
    @classmethod
    def normalize_optional_phone(cls, value: str | None) -> str | None:
        return value.strip() if value else value

    @field_validator("email")
    @classmethod
    def normalize_optional_email(cls, value: str | None) -> str | None:
        return value.strip().lower() if value else value


class LeadResponse(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assigned_user_id: UUID
    assigned_user: AssignedUserResponse
    ai_score: int | None = None
    ai_score_reasoning: str | None = None
    created_at: datetime
