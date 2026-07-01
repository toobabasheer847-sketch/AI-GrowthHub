import unittest
from types import SimpleNamespace

from app.models.lead import LeadSource, LeadStatus
from app.services.ai_assistant import AIService


class AIServiceTests(unittest.TestCase):
    def test_score_lead_fallback_returns_reasonable_value(self):
        service = AIService()
        lead = SimpleNamespace(
            name="Ada",
            company="Northwind Labs",
            industry="SaaS",
            notes="Highly engaged and requesting a demo.",
            status=LeadStatus.QUALIFIED,
            source=LeadSource.REFERRAL,
            follow_ups=[SimpleNamespace(ai_draft="Follow-up about onboarding")],
        )

        result = service.score_lead(lead)

        self.assertGreaterEqual(result["score"], 1)
        self.assertLessEqual(result["score"], 100)
        self.assertIn(".", result["reasoning"])

    def test_summarize_meeting_fallback_extracts_action_items(self):
        service = AIService()
        result = service.summarize_meeting(
            "We agreed to send the proposal by Friday. Action item: confirm pricing. Next step: schedule a follow-up call."
        )

        self.assertTrue(result["summary"])
        self.assertTrue(result["key_action_items"])
        self.assertTrue(result["next_steps"])


if __name__ == "__main__":
    unittest.main()
