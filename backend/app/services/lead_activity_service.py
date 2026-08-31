from sqlalchemy.orm import Session

from backend.app.models.lead_activity import LeadActivity
from backend.app.schemas.lead_activity import LeadActivityCreate


def create_activity(
    db: Session,
    activity: LeadActivityCreate,
):
    db_activity = LeadActivity(
        lead_id=activity.lead_id,
        activity_type=activity.activity_type,
        description=activity.description,
    )

    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)

    return db_activity


def get_lead_activities(
    db: Session,
    lead_id: int,
):
    return (
        db.query(LeadActivity)
        .filter(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.created_at.desc())
        .all()
    )