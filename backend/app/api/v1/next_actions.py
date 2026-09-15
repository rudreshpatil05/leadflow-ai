from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.next_best_action import NextBestAction

router = APIRouter(
    prefix="/next-actions",
    tags=["Next Best Actions"],
)


@router.get("/lead/{lead_id}")
def get_lead_next_action(
    lead_id: int,
    db: Session = Depends(get_db),
):
    return (
        db.query(NextBestAction)
        .filter(
            NextBestAction.lead_id == lead_id,
            NextBestAction.status == "PENDING",
        )
        .order_by(NextBestAction.created_at.desc())
        .first()
    )