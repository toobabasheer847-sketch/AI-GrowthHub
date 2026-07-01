import json
import os
from typing import Any

from langchain_openai import ChatOpenAI

from app.core.config import get_settings

settings = get_settings()


class AIService:
    def __init__(self):
        self._llm: ChatOpenAI | None = None

    def _get_llm(self) -> ChatOpenAI:
        if self._llm is None:
            self._llm = ChatOpenAI(
                api_key=settings.openai_api_key or os.getenv("OPENAI_API_KEY"),
                model=settings.openai_chat_model,
                temperature=0,
            )
        return self._llm

    def _safe_llm_json(self, prompt: str) -> dict[str, Any]:
        try:
            response = self._get_llm().invoke(prompt)
            content = response.content if hasattr(response, "content") else str(response)
            if isinstance(content, str):
                return json.loads(content)
            return {"raw": str(content)}
        except Exception:
            return {}

    def score_lead(self, lead: Any) -> dict[str, Any]:
        prompt = (
            "You are a sales analyst. Score this lead from 1 to 100 based on urgency, fit, engagement, and buying signal. "
            "Return JSON with keys 'score' and 'reasoning'.\n"
            f"Lead: {getattr(lead, 'name', 'N/A')} | Company: {getattr(lead, 'company', 'N/A')} | "
            f"Industry: {getattr(lead, 'industry', getattr(lead, 'company', 'N/A'))} | "
            f"Status: {getattr(lead, 'status', 'N/A')} | Source: {getattr(lead, 'source', 'N/A')} | "
            f"Notes: {getattr(lead, 'notes', 'N/A')} | Follow-ups: {', '.join([getattr(item, 'ai_draft', '') for item in getattr(lead, 'follow_ups', []) if getattr(item, 'ai_draft', '')])}"
        )
        result = self._safe_llm_json(prompt)
        score = int(result.get("score", 0)) if str(result.get("score", 0)).isdigit() else 0
        reasoning = str(result.get("reasoning", "The lead shows moderate momentum and should be reviewed promptly.")).strip()
        if not reasoning.endswith("."):
            reasoning += "."
        return {
            "score": max(1, min(100, score or 50)),
            "reasoning": reasoning,
        }

    def generate_follow_up_email(self, lead: Any) -> str:
        prompt = (
            "You are a helpful sales assistant. Draft a concise follow-up email for this lead. "
            "Return only the email body, no markdown.\n"
            f"Lead: {getattr(lead, 'name', 'N/A')} | Company: {getattr(lead, 'company', 'N/A')} | "
            f"Status: {getattr(lead, 'status', 'N/A')} | Notes: {getattr(lead, 'notes', 'N/A')} | "
            f"Previous follow-ups: {', '.join([getattr(item, 'ai_draft', '') for item in getattr(lead, 'follow_ups', []) if getattr(item, 'ai_draft', '')])}"
        )
        response = self._get_llm().invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        return str(content).strip() or "Hi, thanks for your time. I wanted to follow up on our conversation and share the next steps."

    def summarize_meeting(self, transcript: str) -> dict[str, Any]:
        prompt = (
            "You are a note-taking assistant. Extract a concise meeting summary, key action items, and next steps. "
            "Return JSON with keys 'summary', 'key_action_items', and 'next_steps'.\n"
            f"Transcript: {transcript}"
        )
        result = self._safe_llm_json(prompt)
        return {
            "summary": str(result.get("summary", "Meeting summary unavailable.")).strip() or "Meeting summary unavailable.",
            "key_action_items": result.get("key_action_items") or ["No action items captured."],
            "next_steps": result.get("next_steps") or ["No next steps captured."],
        }


ai_service = AIService()
