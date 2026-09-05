from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.app.models.follow_up import FollowUp
from backend.app.models.lead import Lead


def create_follow_up(
    db: Session,
    lead: Lead,
):
    """
    Create a follow-up for a lead.

    If the lead already has a pending follow-up,
    return the existing one instead of creating a duplicate.
    """

    # Check for an existing pending follow-up
    existing_follow_up = (
        db.query(FollowUp)
        .filter(
            FollowUp.lead_id == lead.id,
            FollowUp.status == "PENDING",
        )
        .order_by(FollowUp.scheduled_at.asc())
        .first()
    )

    if existing_follow_up:
        return existing_follow_up

    now = datetime.utcnow()

    if lead.temperature == "HOT":

        scheduled_at = now
        follow_up_type = "IMMEDIATE"
        action = "Call lead and schedule a site visit"
        reason = "Lead is HOT and should be contacted immediately."

    elif lead.temperature == "WARM":

        scheduled_at = now + timedelta(hours=24)
        follow_up_type = "STANDARD"
        action = "Send matching property details and follow up"
        reason = "Lead is WARM and should be followed up within 24 hours."

    else:

        scheduled_at = now + timedelta(days=3)
        follow_up_type = "NURTURE"
        action = "Send nurturing message and follow up"
        reason = "Lead is COLD and should be nurtured before the next contact."

    follow_up = FollowUp(
        lead_id=lead.id,
        follow_up_type=follow_up_type,
        scheduled_at=scheduled_at,
        status="PENDING",
        action=action,
        reason=reason,
    )

    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    return follow_up