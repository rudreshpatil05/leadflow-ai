from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.models.next_best_action import NextBestAction


def create_next_best_action(
    db: Session,
    lead: Lead,
):
    """
    Determine the next best sales action based on
    lead qualification and requirements.
    """

    # Prevent duplicate pending actions
    existing_action = (
        db.query(NextBestAction)
        .filter(
            NextBestAction.lead_id == lead.id,
            NextBestAction.status == "PENDING",
        )
        .order_by(NextBestAction.created_at.desc())
        .first()
    )

    if existing_action:
        return existing_action

    if lead.temperature == "HOT":

        priority = "HIGH"
        action = "Call lead immediately and schedule a site visit"
        channel = "PHONE"
        reason = (
            "Lead has high purchase potential and should be "
            "contacted immediately."
        )

    elif lead.temperature == "WARM":

        priority = "MEDIUM"
        action = "Send matching property details and follow up"
        channel = "WHATSAPP"
        reason = (
            "Lead has a defined requirement and should receive "
            "relevant property options."
        )

    else:

        priority = "LOW"
        action = "Send a nurturing message and monitor engagement"
        channel = "WHATSAPP"
        reason = (
            "Lead currently has lower purchase intent and should "
            "be nurtured."
        )

    next_action = NextBestAction(
        lead_id=lead.id,
        priority=priority,
        action=action,
        channel=channel,
        reason=reason,
        status="PENDING",
    )

    db.add(next_action)
    db.commit()
    db.refresh(next_action)

    return next_action