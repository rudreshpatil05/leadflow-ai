from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.automation.automation_engine import (
    run_lead_automation,
)

router = APIRouter(
    prefix="/automation",
    tags=["Automation"],
)


@router.post("/lead/{lead_id}/run")
def run_lead_automation_endpoint(
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
            detail="Lead not found",
        )

    return run_lead_automation(
        db,
        lead,
    )


@router.get("/rules")
def get_automation_rules():
    return {
        "rules": [
            {
                "name": "Hot Lead Follow-up",
                "trigger": "HOT_LEAD",
                "enabled": True,
            },
            {
                "name": "Qualified Lead Follow-up",
                "trigger": "QUALIFIED_LEAD",
                "enabled": True,
            },
            {
                "name": "Site Visit Follow-up",
                "trigger": "SITE_VISIT",
                "enabled": True,
            },
            {
                "name": "Inactive Lead Re-engagement",
                "trigger": "INACTIVE_LEAD",
                "enabled": True,
            },
        ]
    }