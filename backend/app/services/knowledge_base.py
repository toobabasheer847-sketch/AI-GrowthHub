import math
from pathlib import Path
from typing import Any
from uuid import UUID

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database.session import SessionLocal
from app.models.chat_history import ChatHistory
from app.services.document_parser import DocumentParser

settings = get_settings()


class KnowledgeBaseService:
    def __init__(self):
        self._vector_store: Chroma | None = None
        self._embeddings: OpenAIEmbeddings | None = None
        self._llm: ChatOpenAI | None = None
        self._parser = DocumentParser()
        self._reranker = None

    def ensure_storage(self) -> None:
        settings.knowledge_base_upload_path.mkdir(parents=True, exist_ok=True)
        settings.chroma_persist_path.mkdir(parents=True, exist_ok=True)

    def _require_openai_key(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OpenAI API key is missing. Set OPENAI_API_KEY before using the knowledge base.")

    def _get_embeddings(self) -> OpenAIEmbeddings:
        self._require_openai_key()
        if self._embeddings is None:
            self._embeddings = OpenAIEmbeddings(
                api_key=settings.openai_api_key,
                model=settings.openai_embedding_model,
            )
        return self._embeddings

    def _get_llm(self) -> ChatOpenAI:
        self._require_openai_key()
        if self._llm is None:
            self._llm = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_chat_model,
                temperature=0,
            )
        return self._llm

    def _get_vector_store(self) -> Chroma:
        if self._vector_store is None:
            self._vector_store = Chroma(
                collection_name=settings.chroma_collection_name,
                persist_directory=str(settings.chroma_persist_path),
                embedding_function=self._get_embeddings(),
            )
        return self._vector_store

    def extract_document_pages(self, file_path: str | Path) -> list[dict[str, Any]]:
        return self._parser.extract_pages(file_path)

    def ingest_document(self, *, document_id: UUID, file_path: str | Path, filename: str) -> dict[str, int]:
        self.ensure_storage()
        pages = self.extract_document_pages(file_path)
        if not pages:
            raise ValueError("No extractable text was found in this file.")

        page_documents = [
            Document(
                page_content=page["text"],
                metadata={
                    "document_id": str(document_id),
                    "filename": filename,
                    "page_number": page["page_number"],
                },
            )
            for page in pages
        ]
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.rag_chunk_size,
            chunk_overlap=settings.rag_chunk_overlap,
        )
        chunked_documents = splitter.split_documents(page_documents)
        if not chunked_documents:
            raise ValueError("The extracted text could not be split into chunks for indexing.")

        ids = [f"{document_id}:{index}" for index in range(len(chunked_documents))]
        self._get_vector_store().add_documents(chunked_documents, ids=ids)

        return {
            "page_count": len(pages),
            "chunk_count": len(chunked_documents),
        }

    def _get_reranker(self):
        if self._reranker is None:
            try:
                from sentence_transformers import CrossEncoder
            except ImportError as exc:
                raise RuntimeError("sentence-transformers is required for re-ranking.") from exc

            self._reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        return self._reranker

    def _compute_bm25_scores(self, query: str, documents: list[Document]) -> list[float]:
        terms = [term.lower() for term in query.split() if term.strip()]
        if not terms:
            return [0.0 for _ in documents]

        doc_term_counts = []
        for document in documents:
            content = document.page_content.lower()
            counts = {term: content.count(term) for term in terms if content.count(term) > 0}
            doc_term_counts.append(counts)

        doc_lengths = [len(document.page_content.split()) or 1 for document in documents]
        avg_length = sum(doc_lengths) / max(len(doc_lengths), 1)

        scores: list[float] = []
        for index, counts in enumerate(doc_term_counts):
            score = 0.0
            for term, count in counts.items():
                df = sum(1 for other_counts in doc_term_counts if term in other_counts)
                idf = math.log((1 + max(len(doc_term_counts), 1)) / (1 + df)) + 1.0
                score += idf * ((count * (1.2 + 1.0)) / (count + 1.2 * (1 - 0.75 + 0.75 * (doc_lengths[index] / avg_length))))
            scores.append(round(score, 4))
        return scores

    def _rank_documents(self, query: str, documents: list[Document], vector_scores: list[float], bm25_scores: list[float]) -> list[Document]:
        if not documents:
            return []

        hybrid_scores: list[tuple[float, Document]] = []
        for document, vector_score, bm25_score in zip(documents, vector_scores, bm25_scores, strict=False):
            hybrid_score = (float(vector_score or 0.0) * 0.7) + (float(bm25_score or 0.0) * 0.3)
            hybrid_scores.append((hybrid_score, document))

        hybrid_scores.sort(key=lambda item: item[0], reverse=True)
        return [document for _, document in hybrid_scores]

    def _rerank_documents(self, query: str, documents: list[Document]) -> list[tuple[Document, float]]:
        if not documents:
            return []

        try:
            reranker = self._get_reranker()
            pairs = [[query, document.page_content] for document in documents]
            scores = reranker.predict(pairs)
            reranked = sorted(zip(documents, scores, strict=False), key=lambda item: float(item[1]), reverse=True)
            return [(document, float(score)) for document, score in reranked]
        except Exception:
            return [(document, 0.0) for document in documents]

    def _build_history_context(self, history: list[ChatHistory]) -> str:
        if not history:
            return ""

        lines = []
        for item in history[-5:]:
            speaker = "User" if item.sender == "user" else "Assistant"
            lines.append(f"{speaker}: {item.message}")
        return "\n".join(lines)

    def _load_history_context(self, session_id: str | None, user_id: UUID | None) -> list[ChatHistory]:
        if not session_id or not user_id:
            return []

        with SessionLocal() as db:
            query = (
                select(ChatHistory)
                .where(ChatHistory.user_id == user_id, ChatHistory.session_id == session_id)
                .order_by(ChatHistory.timestamp.asc())
            )
            return list(db.execute(query).scalars().all())

    def answer_question(self, question: str, *, session_id: str | None = None, user_id: UUID | None = None) -> dict[str, Any]:
        self.ensure_storage()
        vector_results = self._get_vector_store().similarity_search_with_relevance_scores(
            question,
            k=settings.rag_top_k * 3,
        )

        if not vector_results:
            return {
                "answer": "I could not find any matching knowledge base content yet. Ask an admin to upload support PDFs first.",
                "sources": [],
            }

        documents = [document for document, _ in vector_results]
        vector_scores = [float(score or 0.0) for _, score in vector_results]
        bm25_scores = self._compute_bm25_scores(question, documents)
        ranked_documents = self._rank_documents(question, documents, vector_scores, bm25_scores)
        reranked_documents = self._rerank_documents(question, ranked_documents[: settings.rag_top_k])

        history = self._load_history_context(session_id, user_id)
        history_context = self._build_history_context(history)

        context_blocks: list[str] = []
        sources: list[dict[str, Any]] = []

        for document, rerank_score in reranked_documents:
            snippet = " ".join(document.page_content.split())
            snippet = snippet[:280] + ("..." if len(snippet) > 280 else "")
            page_number = document.metadata.get("page_number")
            filename = document.metadata.get("filename", "Uploaded document")
            document_id = document.metadata.get("document_id")
            sources.append(
                {
                    "document_id": document_id,
                    "filename": filename,
                    "page_number": int(page_number) if page_number else None,
                    "similarity_score": round(float(rerank_score), 4) if rerank_score is not None else None,
                    "snippet": snippet,
                }
            )
            context_blocks.append(
                f"Source: {filename} | Page: {page_number or 'N/A'}\n{document.page_content}"
            )

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are an AI customer support assistant. Answer only using the provided knowledge base context. "
                    "Be concise, practical, and honest. If the answer is not fully supported by the context, say so.",
                ),
                (
                    "human",
                    "Conversation history:\n{history_context}\n\nCustomer question:\n{question}\n\nKnowledge base context:\n{context}",
                ),
            ]
        )
        response = self._get_llm().invoke(
            prompt.format_messages(
                question=question,
                context="\n\n---\n\n".join(context_blocks),
                history_context=history_context or "No prior conversation history.",
            )
        )

        return {
            "answer": response.content if isinstance(response.content, str) else str(response.content),
            "sources": sources,
        }


knowledge_base_service = KnowledgeBaseService()
