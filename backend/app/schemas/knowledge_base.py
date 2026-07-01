from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.knowledge_document import KnowledgeDocumentStatus


class KnowledgeDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    storage_filename: str
    mime_type: str
    status: KnowledgeDocumentStatus
    page_count: int
    chunk_count: int
    failure_reason: str | None = None
    created_by_id: UUID
    created_at: datetime


class SupportQuestionRequest(BaseModel):
    question: str = Field(min_length=2, max_length=1000)
    session_id: str | None = Field(default=None, max_length=255)

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Question must contain at least 2 characters.")
        return normalized

    @field_validator("session_id")
    @classmethod
    def normalize_session_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None


class SupportAnswerSource(BaseModel):
    document_id: UUID
    filename: str
    page_number: int | None = None
    similarity_score: float | None = None
    snippet: str


class SupportAnswerResponse(BaseModel):
    answer: str
    sources: list[SupportAnswerSource]
