from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.models.follow_up import FollowUp
from backend.app.models.lead_activity import LeadActivity


def create_automation_activity(
    db: Session,
    lead: Lead,
    activity_type: str,
    description: str,
):
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type=activity_type,
        description=description,
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    return activity


def create_automated_follow_up(
    db: Session,
    lead: Lead,
    follow_up_type: str,
    scheduled_at: datetime,
    action: str,
    reason: str,
):
    existing = (
        db.query(FollowUp)
        .filter(
            FollowUp.lead_id == lead.id,
            FollowUp.status == "PENDING",
        )
        .first()
    )

    if existing:
        return existing

    follow_up = FollowUp(
        lead_id=lead.id,
        follow_up_type=follow_up_type,
        scheduled_at=scheduled_at,
        action=action,
        reason=reason,
        status="PENDING",
    )

    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    return follow_up


def process_hot_lead(
    db: Session,
    lead: Lead,
):
    scheduled_at = datetime.utcnow() + timedelta(hours=1)

    follow_up = create_automated_follow_up(
        db=db,
        lead=lead,
        follow_up_type="CALL",
        scheduled_at=scheduled_at,
        action="Call hot lead and qualify the opportunity",
        reason="Automation triggered because the lead temperature is HOT.",
    )

    create_automation_activity(
        db,
        lead,
        "AUTOMATION_HOT_LEAD",
        "Automatic hot-lead follow-up created.",
    )

    return follow_up


def process_qualified_lead(
    db: Session,
    lead: Lead,
):
    scheduled_at = datetime.utcnow() + timedelta(hours=4)

    follow_up = create_automated_follow_up(
        db=db,
        lead=lead,
        follow_up_type="WHATSAPP",
        scheduled_at=scheduled_at,
        action="Send relevant property information",
        reason="Lead has reached the QUALIFIED stage.",
    )

    create_automation_activity(
        db,
        lead,
        "AUTOMATION_QUALIFIED",
        "Automatic qualified-lead follow-up created.",
    )

    return follow_up


def process_site_visit(
    db: Session,
    lead: Lead,
):
    scheduled_at = datetime.utcnow() + timedelta(days=1)

    follow_up = create_automated_follow_up(
        db=db,
        lead=lead,
        follow_up_type="SITE_VISIT",
        scheduled_at=scheduled_at,
        action="Follow up regarding site visit",
        reason="Lead reached the SITE_VISIT stage.",
    )

    create_automation_activity(
        db,
        lead,
        "AUTOMATION_SITE_VISIT",
        "Automatic site-visit follow-up created.",
    )

    return follow_up
def process_inactive_leads(
    db: Session,
):
    from datetime import datetime

    now = datetime.utcnow()

    leads = (
        db.query(Lead)
        .filter(
            Lead.status.notin_(
                ["CONVERTED", "LOST"]
            )
        )
        .all()
    )

    processed = []

    for lead in leads:

        last_activity = (
            lead.updated_at
            or lead.created_at
        )

        if not last_activity:
            continue

        age_days = (
            now - last_activity
        ).days

        if age_days < 3:
            continue

        follow_up = create_automated_follow_up(
            db=db,
            lead=lead,
            follow_up_type="WHATSAPP",
            scheduled_at=now,
            action="Send re-engagement message",
            reason=(
                f"Lead has been inactive "
                f"for {age_days} days."
            ),
        )

        create_automation_activity(
            db,
            lead,
            "AUTOMATION_REENGAGEMENT",
            (
                "Automatic re-engagement "
                f"triggered after {age_days} "
                "days of inactivity."
            ),
        )

        processed.append(
            {
                "lead_id": lead.id,
                "age_days": age_days,
                "follow_up_id": follow_up.id,
            }
        )

    return processed