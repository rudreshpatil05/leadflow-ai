from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.follow_up import FollowUp

router = APIRouter(
    prefix="/follow-ups",
    tags=["Follow Ups"],
)


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