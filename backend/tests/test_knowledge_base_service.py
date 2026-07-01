import unittest
import uuid

from langchain_core.documents import Document

from app.models.chat_history import ChatHistory
from app.services.knowledge_base import KnowledgeBaseService


class KnowledgeBaseServiceTests(unittest.TestCase):
    def test_hybrid_ranking_prefers_keyword_matches(self):
        service = KnowledgeBaseService()
        documents = [
            Document(page_content="Company headquarters location in Seattle", metadata={"filename": "about.txt"}),
            Document(page_content="Refund policy for cancelled subscriptions", metadata={"filename": "refunds.txt"}),
        ]

        ranked = service._rank_documents(
            query="refund policy",
            documents=documents,
            vector_scores=[0.92, 0.88],
            bm25_scores=[0.12, 0.95],
        )

        self.assertEqual(ranked[0].page_content, "Refund policy for cancelled subscriptions")
        self.assertEqual(ranked[1].page_content, "Company headquarters location in Seattle")

    def test_history_context_formatting_uses_latest_messages(self):
        service = KnowledgeBaseService()
        history = [
            ChatHistory(user_id=uuid.uuid4(), sender="user", message="Hello", session_id="abc"),
            ChatHistory(user_id=uuid.uuid4(), sender="assistant", message="Hi there", session_id="abc"),
            ChatHistory(user_id=uuid.uuid4(), sender="user", message="How do I reset my password?", session_id="abc"),
        ]

        context = service._build_history_context(history)

        self.assertIn("User: Hello", context)
        self.assertIn("Assistant: Hi there", context)
        self.assertIn("User: How do I reset my password?", context)


if __name__ == "__main__":
    unittest.main()
