from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.lead import Lead

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_leads = db.query(Lead).count()

    hot_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "HOT")
        .count()
    )

    warm_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "WARM")
        .count()
    )

    cold_leads = (
        db.query(Lead)
        .filter(Lead.temperature == "COLD")
        .count()
    )

    return {
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": cold_leads,
    }