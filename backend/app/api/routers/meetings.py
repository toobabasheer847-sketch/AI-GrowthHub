from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.core.limiter import limiter
from app.services.ai_assistant import ai_service

router = APIRouter(prefix="/meetings", tags=["Meetings"])


@router.post("/summarize")
@limiter.limit("10/minute")
def summarize_meeting(
    request: Request,
    transcript: str | None = None,
    file: UploadFile | None = File(default=None),
) -> dict[str, Any]:
    if transcript is None and file is None:
        raise HTTPException(status_code=400, detail="Please provide transcript text or upload a text file.")

    if file is not None:
        content = file.file.read().decode("utf-8", errors="ignore")
    else:
        content = transcript or ""

    return ai_service.summarize_meeting(content)
