from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.auth import require_manager
from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.user import User
from backend.app.services.audit_service import AuditService


router = APIRouter(
    prefix="/duplicates",
    tags=["Duplicate Management"],
)


@router.get("")
def get_duplicates(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    leads = db.query(Lead).order_by(
        Lead.created_at.asc()
    ).all()

    phone_groups = {}
    email_groups = {}

    for lead in leads:

        phone = (
            str(lead.phone or "")
            .replace(" ", "")
            .replace("-", "")
            .replace("+", "")
            .strip()
        )

        if phone:
            phone_groups.setdefault(
                phone,
                [],
            ).append(lead)

        email = (
            str(lead.email or "")
            .strip()
            .lower()
        )

        if email:
            email_groups.setdefault(
                email,
                [],
            ).append(lead)

    duplicates = []

    for key, items in phone_groups.items():
        if len(items) > 1:
            duplicates.append({
                "type": "PHONE",
                "value": key,
                "lead_ids": [lead.id for lead in items],
                "count": len(items),
            })

    for key, items in email_groups.items():
        if len(items) > 1:
            duplicates.append({
                "type": "EMAIL",
                "value": key,
                "lead_ids": [lead.id for lead in items],
                "count": len(items),
            })

    return {
        "success": True,
        "duplicates": duplicates,
        "total_groups": len(duplicates),
    }


@router.post("/merge")
def merge_leads(
    primary_lead_id: int,
    duplicate_lead_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_manager),
):
    if primary_lead_id == duplicate_lead_id:
        raise HTTPException(
            status_code=400,
            detail="Primary and duplicate lead cannot be the same.",
        )

    primary = (
        db.query(Lead)
        .filter(Lead.id == primary_lead_id)
        .first()
    )

    duplicate = (
        db.query(Lead)
        .filter(Lead.id == duplicate_lead_id)
        .first()
    )

    if not primary:
        raise HTTPException(
            status_code=404,
            detail="Primary lead not found.",
        )

    if not duplicate:
        raise HTTPException(
            status_code=404,
            detail="Duplicate lead not found.",
        )

    # Fill missing primary fields.
    fields = [
        "name",
        "email",
        "source",
        "temperature",
        "score",
        "notes",
        "property_type",
        "configuration",
        "location",
        "budget_min",
        "budget_max",
        "currency",
        "timeline",
        "purpose",
        "down_payment",
        "financing_required",
        "qualification_reasons",
        "intent",
        "next_best_action",
        "deal_value",
        "conversion_notes",
        "lost_reason",
        "lost_notes",
    ]

    for field in fields:
        primary_value = getattr(primary, field, None)
        duplicate_value = getattr(
            duplicate,
            field,
            None,
        )

        if (
            primary_value in (None, "", 0)
            and duplicate_value not in (None, "", 0)
        ):
            setattr(
                primary,
                field,
                duplicate_value,
            )

    # Preserve duplicate notes.
    if duplicate.notes:
        if primary.notes:
            primary.notes = (
                f"{primary.notes}\n\n"
                f"[Merged lead #{duplicate.id}]\n"
                f"{duplicate.notes}"
            )
        else:
            primary.notes = (
                f"[Merged lead #{duplicate.id}]\n"
                f"{duplicate.notes}"
            )

    db.delete(duplicate)
    db.commit()
    db.refresh(primary)

    AuditService.log(
        db=db,
        action="MERGE_LEAD",
        entity_type="LEAD",
        entity_id=primary.id,
        user_id=user.id,
        description=(
            f"Lead #{duplicate_lead_id} merged "
            f"into lead #{primary_lead_id}."
        ),
    )
    AuditService.log(
        db=self.db,
        action="AUTOMATION_EXECUTED",
        entity_type="LEAD",
        entity_id=lead.id,
        description=(
            f"Automation rule '{rule.name}' "
            f"executed successfully."
        ),
    )

    return {
        "success": True,
        "message": "Lead merged successfully.",
        "primary_lead_id": primary.id,
        "removed_lead_id": duplicate_lead_id,
    }
