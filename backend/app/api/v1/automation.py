from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.automation_rule import AutomationRule
from backend.app.models.automation_log import AutomationLog
from backend.app.services.automation_service import AutomationService
from backend.app.services.automation_rules import initialize_default_rules


router = APIRouter(
    prefix="/automation",
    tags=["Automation"],
)


@router.post("/initialize")
def initialize_automation(
    db: Session = Depends(get_db),
):
    rules = initialize_default_rules(db)

    return {
        "success": True,
        "created_rules": len(rules),
    }


@router.get("/rules")
def get_automation_rules(
    db: Session = Depends(get_db),
):
    rules = (
        db.query(AutomationRule)
        .order_by(AutomationRule.created_at.desc())
        .all()
    )

    return [
        {
            "id": rule.id,
            "name": rule.name,
            "description": rule.description,
            "event_type": rule.event_type,
            "condition_type": rule.condition_type,
            "condition_value": rule.condition_value,
            "action_type": rule.action_type,
            "action_value": rule.action_value,
            "is_active": rule.is_active,
        }
        for rule in rules
    ]


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
            detail="Automation rule not found",
        )

    rule.is_active = is_active

    db.commit()
    db.refresh(rule)

    return {
        "success": True,
        "rule_id": rule.id,
        "is_active": rule.is_active,
    }


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
            detail="Lead not found",
        )

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
    query = db.query(AutomationLog)

    if lead_id:
        query = query.filter(
            AutomationLog.lead_id == lead_id
        )

    logs = (
        query
        .order_by(AutomationLog.created_at.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": log.id,
            "lead_id": log.lead_id,
            "rule_id": log.rule_id,
            "event_type": log.event_type,
            "action_type": log.action_type,
            "status": log.status,
            "message": log.message,
            "created_at": log.created_at,
        }
        for log in logs
    ]