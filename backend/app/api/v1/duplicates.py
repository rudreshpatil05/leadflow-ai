from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.auth import require_manager
from backend.app.db.database import get_db

from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.models.follow_up import FollowUp
from backend.app.models.notification import Notification
from backend.app.models.automation_log import AutomationLog
from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User


router = APIRouter(
    prefix="/duplicates",
    tags=["Duplicate Management"],
)


@router.get("")
def get_duplicates(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    """
    Detect duplicate leads using normalized phone numbers
    and normalized email addresses.
    """

    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.asc())
        .all()
    )

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
            phone_groups.setdefault(phone, []).append(lead)

        email = (
            str(lead.email or "")
            .strip()
            .lower()
        )

        if email:
            email_groups.setdefault(email, []).append(lead)

    duplicates = []

    for key, items in phone_groups.items():
        if len(items) > 1:
            duplicates.append(
                {
                    "type": "PHONE",
                    "value": key,
                    "lead_ids": [lead.id for lead in items],
                    "count": len(items),
                }
            )

    for key, items in email_groups.items():
        if len(items) > 1:
            duplicates.append(
                {
                    "type": "EMAIL",
                    "value": key,
                    "lead_ids": [lead.id for lead in items],
                    "count": len(items),
                }
            )

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
    """
    Merge duplicate lead into primary lead.

    Rules:
    - Primary lead remains the surviving lead.
    - Missing primary fields are filled from duplicate.
    - Duplicate notes are preserved.
    - Lead activities are reparented.
    - Follow-ups are reparented.
    - Notifications are reparented.
    - Automation logs are reparented.
    - Existing audit history is preserved.
    - A new merge audit entry is created.
    - Duplicate lead is deleted only after all child records
      have been successfully reparented.
    """

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

    if not primary:
        raise HTTPException(
            status_code=404,
            detail="Primary lead not found.",
        )

    duplicate = (
        db.query(Lead)
        .filter(Lead.id == duplicate_lead_id)
        .first()
    )

    if not duplicate:
        raise HTTPException(
            status_code=404,
            detail="Duplicate lead not found.",
        )

    try:
        # ---------------------------------------------------------
        # 1. Preserve useful duplicate information
        # ---------------------------------------------------------

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
            duplicate_value = getattr(duplicate, field, None)

            if (
                primary_value in (None, "", 0)
                and duplicate_value not in (None, "", 0)
            ):
                setattr(
                    primary,
                    field,
                    duplicate_value,
                )

        # ---------------------------------------------------------
        # 2. Preserve duplicate notes
        # ---------------------------------------------------------

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

        # ---------------------------------------------------------
        # 3. Reparent lead activities
        # ---------------------------------------------------------

        activity_count = (
            db.query(LeadActivity)
            .filter(LeadActivity.lead_id == duplicate.id)
            .update(
                {
                    LeadActivity.lead_id: primary.id
                },
                synchronize_session=False,
            )
        )

        # ---------------------------------------------------------
        # 4. Reparent follow-ups
        # ---------------------------------------------------------

        follow_up_count = (
            db.query(FollowUp)
            .filter(FollowUp.lead_id == duplicate.id)
            .update(
                {
                    FollowUp.lead_id: primary.id
                },
                synchronize_session=False,
            )
        )

        # ---------------------------------------------------------
        # 5. Reparent notifications
        # ---------------------------------------------------------

        notification_count = (
            db.query(Notification)
            .filter(Notification.lead_id == duplicate.id)
            .update(
                {
                    Notification.lead_id: primary.id
                },
                synchronize_session=False,
            )
        )

        # ---------------------------------------------------------
        # 6. Reparent automation logs
        # ---------------------------------------------------------

        automation_log_count = (
            db.query(AutomationLog)
            .filter(AutomationLog.lead_id == duplicate.id)
            .update(
                {
                    AutomationLog.lead_id: primary.id
                },
                synchronize_session=False,
            )
        )

        # ---------------------------------------------------------
        # 7. Add merge activity to surviving lead
        # ---------------------------------------------------------

        merge_activity = LeadActivity(
            lead_id=primary.id,
            activity_type="LEAD_MERGED",
            description=(
                f"Lead #{duplicate.id} was merged into "
                f"lead #{primary.id} by user #{user.id}."
            ),
        )

        db.add(merge_activity)

        # ---------------------------------------------------------
        # 8. Preserve audit history
        # ---------------------------------------------------------
        #
        # Existing audit records remain untouched.
        # This is important because historical records should not
        # be rewritten just because a lead was merged.
        #
        # The new merge event is attached to the surviving lead.

        merge_audit = AuditLog(
            lead_id=primary.id,
            action="MERGE_LEAD",
            description=(
                f"Lead #{duplicate.id} merged into "
                f"lead #{primary.id} by user #{user.id}. "
                f"Reparented: "
                f"{activity_count} activities, "
                f"{follow_up_count} follow-ups, "
                f"{notification_count} notifications, "
                f"{automation_log_count} automation logs."
            ),
        )

        db.add(merge_audit)

        # ---------------------------------------------------------
        # 9. Delete duplicate lead
        # ---------------------------------------------------------

        db.delete(duplicate)

        # ---------------------------------------------------------
        # 10. Commit everything together
        # ---------------------------------------------------------

        db.commit()

        db.refresh(primary)

        return {
            "success": True,
            "message": "Lead merged successfully.",
            "primary_lead_id": primary.id,
            "removed_lead_id": duplicate_lead_id,
            "reparented": {
                "activities": activity_count,
                "follow_ups": follow_up_count,
                "notifications": notification_count,
                "automation_logs": automation_log_count,
            },
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Lead merge failed: {str(exc)}",
        )