from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.follow_up import FollowUp
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.services.follow_up_service import create_follow_up


router = APIRouter(
    prefix="/follow-ups",
    tags=["Follow Ups"],
)


class ManualFollowUpCreate(BaseModel):
    follow_up_type: str
    scheduled_at: datetime
    action: str
    reason: str | None = None


@router.post("/lead/{lead_id}")
def create_manual_follow_up(
    lead_id: int,
    payload: ManualFollowUpCreate,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    follow_up = FollowUp(
        lead_id=lead_id,
        follow_up_type=payload.follow_up_type,
        scheduled_at=payload.scheduled_at,
        status="PENDING",
        action=payload.action,
        reason=payload.reason,
    )

    db.add(follow_up)

    activity = LeadActivity(
        lead_id=lead_id,
        activity_type="FOLLOW_UP_CREATED",
        description=f"Follow-up created: {payload.action}",
    )

    db.add(activity)

    db.commit()
    db.refresh(follow_up)

    return follow_up


@router.patch("/{follow_up_id}/complete")
def complete_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
):
    follow_up = (
        db.query(FollowUp)
        .filter(FollowUp.id == follow_up_id)
        .first()
    )

    if follow_up is None:
        raise HTTPException(
            status_code=404,
            detail="Follow-up not found",
        )

    if follow_up.status == "COMPLETED":
        return follow_up

    follow_up.status = "COMPLETED"

    activity = LeadActivity(
        lead_id=follow_up.lead_id,
        activity_type="FOLLOW_UP_COMPLETED",
        description=f"Follow-up completed: {follow_up.action}",
    )

    db.add(follow_up)
    db.add(activity)

    db.commit()
    db.refresh(follow_up)

    lead = (
        db.query(Lead)
        .filter(Lead.id == follow_up.lead_id)
        .first()
    )

    next_follow_up = None

    if lead is not None:
        next_follow_up = create_follow_up(
            db=db,
            lead=lead,
        )

    return {
        "completed_follow_up": follow_up,
        "next_follow_up": next_follow_up,
    }


@router.get("/lead/{lead_id}")
def get_lead_follow_ups(
    lead_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(FollowUp)
        .filter(FollowUp.lead_id == lead_id)
        .order_by(FollowUp.scheduled_at.desc())
        .all()
    )