from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FollowUpCreate(BaseModel):
    lead_id: UUID
    scheduled_at: datetime
    is_automated: bool = True


class FollowUpDraftRequest(BaseModel):
    notes: str | None = None


class FollowUpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lead_id: UUID
    scheduled_at: datetime
    ai_draft: str | None = None
    status: str
    is_automated: bool
    created_at: datetime
