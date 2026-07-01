from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "AI GrowthHub API"
    environment: str = "development"
    api_v1_str: str = "/api/v1"
    frontend_origin: str = "http://localhost:5173"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/ai_growthhub"
    jwt_secret_key: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    openai_api_key: str | None = None
    openai_embedding_model: str = "text-embedding-3-small"
    openai_chat_model: str = "gpt-4o-mini"
    rag_chunk_size: int = 1000
    rag_chunk_overlap: int = 200
    rag_top_k: int = 4
    max_pdf_upload_size_mb: int = 15
    knowledge_base_upload_dir: str = "data/knowledge_base/uploads"
    chroma_persist_directory: str = "data/chroma"
    chroma_collection_name: str = "knowledge_base"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def backend_dir(self) -> Path:
        return Path(__file__).resolve().parents[2]

    @property
    def knowledge_base_upload_path(self) -> Path:
        return (self.backend_dir / self.knowledge_base_upload_dir).resolve()

    @property
    def chroma_persist_path(self) -> Path:
        return (self.backend_dir / self.chroma_persist_directory).resolve()


@lru_cache
def get_settings() -> Settings:
    return Settings()
