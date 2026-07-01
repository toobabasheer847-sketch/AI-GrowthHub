from fastapi import APIRouter

from app.core.config import get_settings

router = APIRouter(prefix="/health", tags=["Health"])
settings = get_settings()


@router.get("")
def health_check():
    return {
        "status": "ok",
        "service": settings.project_name,
        "environment": settings.environment,
    }
