from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.authentication.dependencies import RoleChecker, get_current_user
from app.core.limiter import limiter
from app.database.session import get_db
from app.models.lead import Lead
from app.models.user import User, UserRole
from app.schemas.lead import LeadCreate, LeadResponse, LeadUpdate
from app.services.ai_assistant import ai_service

router = APIRouter(prefix="/leads", tags=["Leads"])


def _resolve_assigned_user_id(payload_user_id: UUID | None, current_user: User) -> UUID:
    if payload_user_id and current_user.role != UserRole.ADMIN and payload_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot assign leads to other users.")
    return payload_user_id or current_user.id


def _get_lead_or_404(db: Session, lead_id: UUID, current_user: User) -> Lead:
    query = (
        select(Lead)
        .options(selectinload(Lead.assigned_user))
        .where(Lead.id == lead_id)
    )
    if current_user.role != UserRole.ADMIN:
        query = query.where(Lead.assigned_user_id == current_user.id)

    lead = db.execute(query).scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    return lead


@router.get("", response_model=list[LeadResponse])
def list_leads(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = select(Lead).options(selectinload(Lead.assigned_user)).order_by(Lead.created_at.desc())
    if current_user.role != UserRole.ADMIN:
        query = query.where(Lead.assigned_user_id == current_user.id)

    return list(db.execute(query).scalars().all())


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    assigned_user_id = _resolve_assigned_user_id(payload.assigned_user_id, current_user)

    if assigned_user_id != current_user.id:
        assigned_user = db.execute(select(User).where(User.id == assigned_user_id)).scalar_one_or_none()
        if not assigned_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found.")

    lead = Lead(
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        company=payload.company,
        status=payload.status,
        source=payload.source,
        assigned_user_id=assigned_user_id,
    )
    db.add(lead)
    db.commit()

    return _get_lead_or_404(db, lead.id, current_user)


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: UUID,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["ADMIN", "EDITOR"])),
):
    lead = _get_lead_or_404(db, lead_id, current_user)
    update_data = payload.model_dump(exclude_unset=True)

    if "assigned_user_id" in update_data:
        assigned_user_id = _resolve_assigned_user_id(update_data["assigned_user_id"], current_user)
        if assigned_user_id != current_user.id:
            assigned_user = db.execute(select(User).where(User.id == assigned_user_id)).scalar_one_or_none()
            if not assigned_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned user not found.")
        update_data["assigned_user_id"] = assigned_user_id

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.add(lead)
    db.commit()

    return _get_lead_or_404(db, lead.id, current_user)


@router.get("/{lead_id}/score")
@limiter.limit("10/minute")
def score_lead(
    request: Request,
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    lead = _get_lead_or_404(db, lead_id, current_user)
    scoring_result = ai_service.score_lead(lead)
    lead.ai_score = scoring_result["score"]
    lead.ai_score_reasoning = scoring_result["reasoning"]
    db.add(lead)
    db.commit()
    return scoring_result


@router.post("/{lead_id}/generate-email")
@limiter.limit("10/minute")
def generate_follow_up_email(
    request: Request,
    lead_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    lead = _get_lead_or_404(db, lead_id, current_user)
    draft = ai_service.generate_follow_up_email(lead)
    return {"email_draft": draft}


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["ADMIN", "EDITOR"]))):
    lead = _get_lead_or_404(db, lead_id, current_user)
    db.delete(lead)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
