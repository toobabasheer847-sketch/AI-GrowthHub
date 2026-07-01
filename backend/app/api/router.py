from fastapi import APIRouter

from app.api.routers.auth import router as auth_router
from app.api.routers.chat import router as chat_router
from app.api.routers.followups import router as followups_router
from app.api.routers.health import router as health_router
from app.api.routers.knowledge_base import router as knowledge_base_router
from app.api.routers.leads import router as leads_router
from app.api.routers.meetings import router as meetings_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(knowledge_base_router)
api_router.include_router(leads_router)
api_router.include_router(followups_router)
