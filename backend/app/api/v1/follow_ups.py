from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.follow_up import FollowUp
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.services.follow_up_service import create_follow_up
from backend.app.services.audit_service import AuditService


router = APIRouter(prefix="/follow-ups", tags=["Follow Ups"])


class ManualFollowUpCreate(BaseModel):
    follow_up_type: str
    scheduled_at: datetime
    action: str
    reason: str | None = None
    notes: str | None = None


class RescheduleFollowUpRequest(BaseModel):
    scheduled_at: datetime
    notes: str | None = None


@router.post("/lead/{lead_id}")
def create_manual_follow_up(
    lead_id: int,
    payload: ManualFollowUpCreate,
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

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
        notes=payload.notes,
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

    AuditService.log(
        db=db,
        action="CREATE_FOLLOW_UP",
        lead_id=lead_id,
        description=f"Follow-up created: {payload.action}",
    )

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
        return {
            "completed_follow_up": follow_up,
            "next_follow_up": None,
            "message": "Follow-up was already completed",
        }

    if follow_up.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cancelled follow-up cannot be completed",
        )

    follow_up.status = "COMPLETED"
    follow_up.completed_at = datetime.utcnow()

    activity = LeadActivity(
        lead_id=follow_up.lead_id,
        activity_type="FOLLOW_UP_COMPLETED",
        description=f"Follow-up completed: {follow_up.action}",
    )

    db.add(activity)
    db.commit()
    db.refresh(follow_up)

    AuditService.log(
        db=db,
        action="COMPLETE_FOLLOW_UP",
        lead_id=follow_up.lead_id,
        description=f"Follow-up completed: {follow_up.action}",
    )

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


@router.patch("/{follow_up_id}/reschedule")
def reschedule_follow_up(
    follow_up_id: int,
    payload: RescheduleFollowUpRequest,
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
        raise HTTPException(
            status_code=400,
            detail="Completed follow-up cannot be rescheduled",
        )

    if follow_up.status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Cancelled follow-up cannot be rescheduled",
        )

    old_scheduled_at = follow_up.scheduled_at

    follow_up.scheduled_at = payload.scheduled_at

    if payload.notes is not None:
        follow_up.notes = payload.notes

    activity = LeadActivity(
        lead_id=follow_up.lead_id,
        activity_type="FOLLOW_UP_RESCHEDULED",
        description=(
            f"Follow-up rescheduled from "
            f"{old_scheduled_at} to {payload.scheduled_at}"
        ),
    )

    db.add(activity)
    db.commit()
    db.refresh(follow_up)

    AuditService.log(
        db=db,
        action="RESCHEDULE_FOLLOW_UP",
        lead_id=follow_up.lead_id,
        description=(
            f"Follow-up rescheduled from "
            f"{old_scheduled_at} to {payload.scheduled_at}"
        ),
    )

    return follow_up


@router.post("/{follow_up_id}/cancel")
def cancel_follow_up(
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
        raise HTTPException(
            status_code=400,
            detail="Completed follow-up cannot be cancelled",
        )

    if follow_up.status == "CANCELLED":
        return follow_up

    follow_up.status = "CANCELLED"
    follow_up.cancelled_at = datetime.utcnow()

    activity = LeadActivity(
        lead_id=follow_up.lead_id,
        activity_type="FOLLOW_UP_CANCELLED",
        description=f"Follow-up cancelled: {follow_up.action}",
    )

    db.add(activity)
    db.commit()
    db.refresh(follow_up)

    AuditService.log(
        db=db,
        action="CANCEL_FOLLOW_UP",
        lead_id=follow_up.lead_id,
        description=f"Follow-up cancelled: {follow_up.action}",
    )

    return follow_up


@router.get("/lead/{lead_id}")
def get_lead_follow_ups(
    lead_id: int,
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

    return (
        db.query(FollowUp)
        .filter(FollowUp.lead_id == lead_id)
        .order_by(FollowUp.scheduled_at.desc())
        .all()
    )