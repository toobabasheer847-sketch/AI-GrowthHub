from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import get_settings
from app.core.limiter import limiter
from app.database.base import Base
from app.database.session import engine
from app.models.chat_history import ChatHistory  # noqa: F401
from app.models.conversation import Conversation  # noqa: F401
from app.models.follow_up import FollowUp  # noqa: F401
from app.models.knowledge_document import KnowledgeDocument  # noqa: F401
from app.models.lead import Lead  # noqa: F401
from app.models.message import Message  # noqa: F401
from app.models.user import User  # noqa: F401
from app.services.knowledge_base import knowledge_base_service

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    knowledge_base_service.ensure_storage()


@app.get("/")
@limiter.limit("20/minute")
def root(request: Request):
    return {
        "message": "AI GrowthHub API is running.",
        "docs": "/docs",
    }


app.include_router(api_router, prefix=settings.api_v1_str)
