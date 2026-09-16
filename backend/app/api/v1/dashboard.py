from collections import defaultdict

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


@router.get("/source-analytics")
def get_source_analytics(db: Session = Depends(get_db)):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    analytics = defaultdict(
        lambda: {
            "total": 0,
            "hot": 0,
            "warm": 0,
            "cold": 0,
        }
    )

    for lead in leads:
        source = (lead.source or "OTHER").strip().upper()

        if not source:
            source = "OTHER"

        analytics[source]["total"] += 1

        if lead.temperature == "HOT":
            analytics[source]["hot"] += 1

        elif lead.temperature == "WARM":
            analytics[source]["warm"] += 1

        elif lead.temperature == "COLD":
            analytics[source]["cold"] += 1

    return [
        {
            "source": source,
            "total": data["total"],
            "hot": data["hot"],
            "warm": data["warm"],
            "cold": data["cold"],
        }
        for source, data in sorted(
            analytics.items(),
            key=lambda item: item[1]["total"],
            reverse=True,
        )
    ]