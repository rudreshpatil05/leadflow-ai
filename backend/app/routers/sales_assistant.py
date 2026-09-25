from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.services.sales_copilot_service import generate_sales_copilot

router = APIRouter(
    prefix="/sales-assistant",
    tags=["Sales Assistant"],
)


@router.get("/{lead_id}")
def get_sales_assistant(
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

    try:
        result = generate_sales_copilot(lead)

        return {
            "lead_id": lead.id,
            "result": result,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Sales assistant generation failed: {str(exc)}",
        )