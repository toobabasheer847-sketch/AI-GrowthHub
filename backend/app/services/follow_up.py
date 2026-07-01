from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.follow_up import FollowUp
from app.models.lead import Lead

settings = get_settings()


def build_follow_up_draft(lead: Any, notes: str | None = None) -> str:
    notes_text = notes or "No additional notes were provided."
    return (
        f"Hi {lead.name},\n\n"
        f"I hope you are doing well. I wanted to follow up regarding your interest in {lead.company}. "
        f"Based on our recent conversation, {notes_text} I would love to continue the conversation and help with next steps. "
        f"Would you be open to a quick call this week?\n\n"
        f"Best regards,\n"
        f"The {lead.company} team"
    )


def generate_follow_up_draft(db: Session, lead_id: UUID, notes: str | None = None) -> str:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise ValueError("Lead not found.")

    try:
        if settings.openai_api_key:
            from langchain_openai import ChatOpenAI

            prompt = (
                f"Write a professional follow-up email to {lead.name} from {lead.company} "
                f"based on these interaction notes: {notes or 'No notes provided.'}. "
                "Keep it natural, concise, and include a clear call to action."
            )
            llm = ChatOpenAI(api_key=settings.openai_api_key, model=settings.openai_chat_model)
            response = llm.invoke(prompt)
            content = getattr(response, "content", None) or str(response)
            if content:
                return str(content)
    except Exception:
        pass

    return build_follow_up_draft(lead, notes=notes)


def send_follow_up_email(follow_up: FollowUp, lead: Lead) -> bool:
    if not lead.email:
        return False
    return True
