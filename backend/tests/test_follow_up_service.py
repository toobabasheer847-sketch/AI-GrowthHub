import unittest
from types import SimpleNamespace

from app.services.follow_up import build_follow_up_draft


class FollowUpServiceTests(unittest.TestCase):
    def test_build_follow_up_draft_includes_lead_context(self):
        lead = SimpleNamespace(
            name="Ada Lovelace",
            company="Northwind Labs",
            email="ada@northwind.com",
            status="new",
        )

        draft = build_follow_up_draft(lead, notes="Discussed onboarding and requested pricing.")

        self.assertIn("Ada Lovelace", draft)
        self.assertIn("Northwind Labs", draft)
        self.assertIn("pricing", draft.lower())


if __name__ == "__main__":
    unittest.main()
