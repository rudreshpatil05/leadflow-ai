
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.auth import require_sales
from backend.app.core.lead_access import get_accessible_lead
from backend.app.db.database import get_db
from backend.app.models.next_best_action import NextBestAction
from backend.app.models.user import User

router = APIRouter(prefix="/next-actions", tags=["Next Best Actions"])


@router.get("/lead/{lead_id}")
def get_lead_next_action(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_sales),
):
    get_accessible_lead(lead_id, db, current_user)

    return (
        db.query(NextBestAction)
        .filter(
            NextBestAction.lead_id == lead_id,
            NextBestAction.status == "PENDING",
        )
        .order_by(NextBestAction.created_at.desc())
        .first()
    )
