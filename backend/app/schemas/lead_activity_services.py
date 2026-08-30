from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.lead_activity import LeadActivity
from backend.app.schemas.lead_activity import LeadActivityCreate


def create_activity(
    db: Session,
    activity_data: LeadActivityCreate,
) -> LeadActivity:

    activity = LeadActivity(
        **activity_data.model_dump()
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity


def get_lead_activities(
    db: Session,
    lead_id: int,
) -> list[LeadActivity]:

    query = (
        select(LeadActivity)
        .where(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.desc())
    )

    return list(db.scalars(query).all())