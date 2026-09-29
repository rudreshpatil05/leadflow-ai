from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import Base, engine, get_db
from backend.app.models.automation_rule import AutomationRule
from backend.app.models.automation_log import AutomationLog
from backend.app.services.automation_rules import initialize_default_rules
from backend.app.services.ai_followup_service import AIFollowUpService
from backend.app.models.lead import Lead
from backend.app.models.follow_up import FollowUp
from backend.app.models.notification import Notification

router = APIRouter(
    prefix="/automation",
    tags=["Automation"],
)


@router.post("/initialize")
def initialize_automation(db: Session = Depends(get_db)):
    try:
        Base.metadata.create_all(
            bind=engine,
            tables=[
                AutomationRule.__table__,
                AutomationLog.__table__,
                FollowUp.__table__,
                Notification.__table__,
            ],
        )

        rules = initialize_default_rules(db)

        return {
            "success": True,
            "message": "Automation system initialized successfully.",
            "rules_created": len(rules),
            "rules": [
                {
                    "id": rule.id,
                    "name": rule.name,
                    "event_type": rule.event_type,
                    "condition_type": rule.condition_type,
                    "condition_value": rule.condition_value,
                    "action_type": rule.action_type,
                    "action_value": rule.action_value,
                    "is_active": rule.is_active,
                }
                for rule in rules
            ],
        }

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Automation initialization failed: {str(exc)}",
        )
    """
    Create Phase 7 automation tables and initialize
    the default automation rules.
    """

    try:
        # Create only the Phase 7 automation tables.
        Base.metadata.create_all(
            bind=engine,
            tables=[
                AutomationRule.__table__,
                AutomationLog.__table__,
            ],
        )

        # Now that the table exists, initialize default rules.
        rules = initialize_default_rules(db)

        return {
            "success": True,
            "message": "Automation system initialized successfully.",
            "rules_created": len(rules),
            "rules": [
                {
                    "id": rule.id,
                    "name": rule.name,
                    "event_type": rule.event_type,
                    "condition_type": rule.condition_type,
                    "condition_value": rule.condition_value,
                    "action_type": rule.action_type,
                    "action_value": rule.action_value,
                    "is_active": rule.is_active,
                }
                for rule in rules
            ],
        }

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Automation initialization failed: {str(exc)}",
        )


@router.get("/rules")
def get_automation_rules(
    db: Session = Depends(get_db),
):
    return (
        db.query(AutomationRule)
        .order_by(AutomationRule.id.asc())
        .all()
    )


@router.patch("/rules/{rule_id}")
def update_automation_rule(
    rule_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
):
    rule = (
        db.query(AutomationRule)
        .filter(AutomationRule.id == rule_id)
        .first()
    )

    if not rule:
        raise HTTPException(
            status_code=404,
            detail="Automation rule not found.",
        )

    rule.is_active = is_active

    db.commit()
    db.refresh(rule)

    return rule


@router.post("/leads/{lead_id}/run")
def run_lead_automation(
    lead_id: int,
    event_type: str = "LEAD_CREATED",
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found.",
        )

    from backend.app.services.automation_service import AutomationService

    service = AutomationService(db)

    return service.process_event(
        lead=lead,
        event_type=event_type,
    )


@router.get("/logs")
def get_automation_logs(
    lead_id: int | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(AutomationLog)
        .order_by(AutomationLog.created_at.desc())
    )

    if lead_id:
        query = query.filter(
            AutomationLog.lead_id == lead_id
        )

    return query.all()


@router.post("/leads/{lead_id}/ai-follow-up")
def generate_ai_follow_up(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )

    if not lead:
        raise HTTPException(
            status_code=404,
            detail="Lead not found.",
        )

    try:
        service = AIFollowUpService()

        result = service.generate_message(lead)

        return {
            "success": True,
            "lead_id": lead.id,
            "result": result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"AI follow-up generation failed: {str(exc)}",
        )