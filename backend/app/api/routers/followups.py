from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.authentication.dependencies import get_current_user
from app.database.session import get_db
from app.models.follow_up import FollowUp
from app.models.lead import Lead
from app.models.user import User, UserRole
from app.schemas.follow_up import FollowUpCreate, FollowUpDraftRequest, FollowUpResponse
from app.services.follow_up import generate_follow_up_draft, send_follow_up_email

router = APIRouter(prefix="/follow-ups", tags=["Follow Ups"])


def _get_lead_for_user_or_404(db: Session, lead_id: UUID, current_user: User) -> Lead:
    query = select(Lead).where(Lead.id == lead_id)
    if current_user.role != UserRole.ADMIN:
        query = query.where(Lead.assigned_user_id == current_user.id)

    lead = db.execute(query).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    return lead


def _get_follow_up_for_user_or_404(db: Session, follow_up_id: int, current_user: User) -> FollowUp:
    follow_up = (
        db.execute(
            select(FollowUp)
            .options(selectinload(FollowUp.lead))
            .where(FollowUp.id == follow_up_id)
        )
        .scalar_one_or_none()
    )
    if not follow_up:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up not found.")
    if current_user.role != UserRole.ADMIN and follow_up.lead.assigned_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this follow-up.")
    return follow_up


@router.post("/schedule", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def schedule_follow_up(
    payload: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = _get_lead_for_user_or_404(db, payload.lead_id, current_user)

    follow_up = FollowUp(
        lead_id=lead.id,
        scheduled_at=payload.scheduled_at,
        is_automated=payload.is_automated,
        status="pending",
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


@router.post("/{follow_up_id}/generate-draft", response_model=FollowUpResponse)
def generate_follow_up_draft_endpoint(
    follow_up_id: int,
    payload: FollowUpDraftRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow_up = _get_follow_up_for_user_or_404(db, follow_up_id, current_user)
    draft = generate_follow_up_draft(db, follow_up.lead_id, notes=payload.notes if payload else None)

    follow_up.ai_draft = draft
    follow_up.status = "draft_generated"
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


@router.post("/{follow_up_id}/send", response_model=FollowUpResponse)
def send_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    follow_up = _get_follow_up_for_user_or_404(db, follow_up_id, current_user)

    if not follow_up.ai_draft:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Generate a draft before sending.")

    success = send_follow_up_email(follow_up, follow_up.lead)
    follow_up.status = "sent" if success else "failed"
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)
    return follow_up


@router.get("/lead/{lead_id}", response_model=list[FollowUpResponse])
def list_follow_ups_for_lead(
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = _get_lead_for_user_or_404(db, lead_id, current_user)
    follow_ups = (
        db.execute(select(FollowUp).where(FollowUp.lead_id == lead.id).order_by(FollowUp.created_at.desc()))
        .scalars()
        .all()
    )
    return list(follow_ups)
