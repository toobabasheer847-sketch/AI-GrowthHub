from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.authentication.dependencies import RoleChecker, get_current_admin, get_current_user
from app.core.config import get_settings
from app.core.limiter import limiter
from app.database.session import get_db
from app.models.chat_history import ChatHistory
from app.models.knowledge_document import KnowledgeDocument, KnowledgeDocumentStatus
from app.models.user import User
from app.schemas.knowledge_base import (
    KnowledgeDocumentResponse,
    SupportAnswerResponse,
    SupportQuestionRequest,
)
from app.services.knowledge_base import knowledge_base_service

router = APIRouter(tags=["Knowledge Base"])
settings = get_settings()


def _build_storage_filename(original_filename: str) -> str:
    suffix = Path(original_filename).suffix.lower()
    return f"{uuid4()}{suffix or '.txt'}"


def _process_uploaded_document(document_id: str, storage_path: str, original_filename: str) -> None:
    from uuid import UUID

    from app.database.session import SessionLocal

    db = SessionLocal()
    try:
        document = db.get(KnowledgeDocument, UUID(document_id))
        if not document:
            return

        try:
            ingest_result = knowledge_base_service.ingest_document(
                document_id=document.id,
                file_path=storage_path,
                filename=original_filename,
            )
            document.status = KnowledgeDocumentStatus.READY
            document.page_count = ingest_result["page_count"]
            document.chunk_count = ingest_result["chunk_count"]
            document.failure_reason = None
        except RuntimeError as exc:
            document.status = KnowledgeDocumentStatus.FAILED
            document.failure_reason = str(exc)
        except ValueError as exc:
            document.status = KnowledgeDocumentStatus.FAILED
            document.failure_reason = str(exc)
        except Exception as exc:
            document.status = KnowledgeDocumentStatus.FAILED
            document.failure_reason = "Failed to index the uploaded document."
            print(f"Knowledge base ingestion failed: {exc}")
        finally:
            db.add(document)
            db.commit()
            db.refresh(document)
    finally:
        db.close()


@router.get("/knowledge-base/documents", response_model=list[KnowledgeDocumentResponse])
def list_knowledge_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    del current_user
    documents = db.execute(
        select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())
    ).scalars().all()
    return list(documents)


@router.post(
    "/knowledge-base/documents",
    response_model=KnowledgeDocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_knowledge_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "EDITOR"])),
):
    filename = file.filename or "document.txt"
    extension = Path(filename).suffix.lower()
    supported_extensions = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".jpeg"}
    if extension not in supported_extensions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty.")

    max_file_size = settings.max_pdf_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_file_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Files must be {settings.max_pdf_upload_size_mb}MB or smaller.",
        )

    knowledge_base_service.ensure_storage()
    storage_filename = _build_storage_filename(filename)
    saved_path = settings.knowledge_base_upload_path / storage_filename
    saved_path.write_bytes(file_bytes)

    document = KnowledgeDocument(
        original_filename=filename,
        storage_filename=storage_filename,
        mime_type=file.content_type or "application/octet-stream",
        file_path=str(saved_path),
        status=KnowledgeDocumentStatus.PROCESSING,
        created_by_id=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    background_tasks.add_task(
        _process_uploaded_document,
        str(document.id),
        str(saved_path),
        document.original_filename,
    )

    return document


@router.post("/support/ask", response_model=SupportAnswerResponse)
@limiter.limit("10/minute")
def ask_support_question(
    request: Request,
    payload: SupportQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session_id = payload.session_id or f"support:{current_user.id}"
        answer = knowledge_base_service.answer_question(
            payload.question,
            session_id=session_id,
            user_id=current_user.id,
        )

        db.add_all(
            [
                ChatHistory(
                    user_id=current_user.id,
                    session_id=session_id,
                    sender="user",
                    message=payload.question,
                ),
                ChatHistory(
                    user_id=current_user.id,
                    session_id=session_id,
                    sender="assistant",
                    message=answer["answer"],
                ),
            ]
        )
        db.commit()

        return answer
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
