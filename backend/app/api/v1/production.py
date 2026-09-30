import csv
import io
from datetime import datetime, date, timedelta

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Query,
)
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.auth import (
    require_admin,
    require_manager,
    require_sales,
)
from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.models.follow_up import FollowUp
from backend.app.models.audit_log import AuditLog
from backend.app.models.notification import Notification
from backend.app.models.user import User


router = APIRouter(
    prefix="/production",
    tags=["Production CRM"],
)


# =========================================================
# HELPERS
# =========================================================

def normalize_status(value):
    return str(value or "").strip().upper()


def normalize_temperature(value):
    value = str(value or "").strip().upper()

    if value in {"HOT", "WARM", "COLD"}:
        return value

    return None


def safe_float(value):
    if value in (None, "", "null", "None"):
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def safe_bool(value):
    if value in (None, ""):
        return None

    value = str(value).strip().lower()

    if value in {"true", "1", "yes", "y"}:
        return True

    if value in {"false", "0", "no", "n"}:
        return False

    return None


def lead_to_export_row(lead):
    return {
        "id": lead.id,
        "name": lead.name or "",
        "phone": lead.phone or "",
        "email": lead.email or "",
        "source": lead.source or "",
        "status": lead.status or "",
        "temperature": lead.temperature or "",
        "score": lead.score or 0,
        "notes": lead.notes or "",
        "property_type": lead.property_type or "",
        "configuration": lead.configuration or "",
        "location": lead.location or "",
        "budget_min": lead.budget_min or "",
        "budget_max": lead.budget_max or "",
        "currency": lead.currency or "INR",
        "timeline": lead.timeline or "",
        "purpose": lead.purpose or "",
        "down_payment": lead.down_payment or "",
        "financing_required": (
            lead.financing_required
            if lead.financing_required is not None
            else ""
        ),
        "intent": lead.intent or "",
        "deal_value": lead.deal_value or "",
        "conversion_date": (
            lead.conversion_date.isoformat()
            if lead.conversion_date
            else ""
        ),
        "lost_date": (
            lead.lost_date.isoformat()
            if lead.lost_date
            else ""
        ),
        "lost_reason": lead.lost_reason or "",
        "created_at": (
            lead.created_at.isoformat()
            if lead.created_at
            else ""
        ),
        "updated_at": (
            lead.updated_at.isoformat()
            if lead.updated_at
            else ""
        ),
    }


# =========================================================
# HEALTH
# ALL AUTHENTICATED USERS
# =========================================================

@router.get("/health")
def production_health(
    db: Session = Depends(get_db),
    _: User = Depends(require_sales),
):
    try:
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "service": "LeadFlow AI",
            "timestamp": datetime.utcnow().isoformat(),
        }

    except Exception as exc:
        return {
            "status": "degraded",
            "database": "disconnected",
            "service": "LeadFlow AI",
            "error": str(exc),
            "timestamp": datetime.utcnow().isoformat(),
        }


# =========================================================
# CREATE PHASE 6 TABLES
# ADMIN ONLY
# =========================================================

@router.post("/initialize")
def initialize_production_tables(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Creates Phase 6 tables if they do not already exist.
    """

    from backend.app.db.database import Base, engine

    Base.metadata.create_all(
        bind=engine,
        tables=[
            AuditLog.__table__,
            Notification.__table__,
        ],
    )

    return {
        "status": "success",
        "message": "Phase 6 tables initialized.",
        "tables": [
            "audit_logs",
            "notifications",
        ],
    }


# =========================================================
# CSV EXPORT
# MANAGER / ADMIN
# =========================================================

@router.get("/leads/export")
def export_leads(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    output = io.StringIO()

    fieldnames = [
        "id",
        "name",
        "phone",
        "email",
        "source",
        "status",
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
        "intent",
        "deal_value",
        "conversion_date",
        "lost_date",
        "lost_reason",
        "created_at",
        "updated_at",
    ]

    writer = csv.DictWriter(
        output,
        fieldnames=fieldnames,
    )

    writer.writeheader()

    for lead in leads:
        writer.writerow(
            lead_to_export_row(lead)
        )

    output.seek(0)

    filename = (
        f"leadflow_leads_"
        f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    )

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            )
        },
    )


# =========================================================
# CSV IMPORT
# ADMIN ONLY
# =========================================================

@router.post("/leads/import")
async def import_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="CSV file is required.",
        )

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported.",
        )

    content = await file.read()

    try:
        decoded = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = content.decode(
            "latin-1",
            errors="replace",
        )

    reader = csv.DictReader(
        io.StringIO(decoded)
    )

    if not reader.fieldnames:
        raise HTTPException(
            status_code=400,
            detail="CSV has no header row.",
        )

    required_fields = {
        "phone",
    }

    headers = {
        str(field).strip().lower()
        for field in reader.fieldnames
        if field
    }

    missing = required_fields - headers

    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing required columns: "
                + ", ".join(sorted(missing))
            ),
        )

    created = 0
    skipped = 0
    errors = []

    existing_phones = {
        str(phone[0]).strip()
        for phone in db.query(Lead.phone).all()
        if phone[0]
    }

    for row_number, raw_row in enumerate(
        reader,
        start=2,
    ):
        try:
            row = {
                str(key).strip().lower(): value
                for key, value in raw_row.items()
                if key
            }

            phone = str(
                row.get("phone") or ""
            ).strip()

            if not phone:
                skipped += 1

                errors.append(
                    {
                        "row": row_number,
                        "error": "Phone is required.",
                    }
                )

                continue

            if phone in existing_phones:
                skipped += 1
                continue

            lead = Lead(
                name=row.get("name") or None,
                phone=phone,
                email=row.get("email") or None,
                source=row.get("source") or "IMPORT",
                status=normalize_status(
                    row.get("status")
                ) or "NEW",
                temperature=normalize_temperature(
                    row.get("temperature")
                ),
                score=int(
                    safe_float(
                        row.get("score")
                    ) or 0
                ),
                notes=row.get("notes") or None,
                property_type=(
                    row.get("property_type")
                    or None
                ),
                configuration=(
                    row.get("configuration")
                    or None
                ),
                location=(
                    row.get("location")
                    or None
                ),
                budget_min=safe_float(
                    row.get("budget_min")
                ),
                budget_max=safe_float(
                    row.get("budget_max")
                ),
                currency=(
                    row.get("currency")
                    or "INR"
                ),
                timeline=(
                    row.get("timeline")
                    or None
                ),
                purpose=(
                    row.get("purpose")
                    or None
                ),
                down_payment=safe_float(
                    row.get("down_payment")
                ),
                financing_required=safe_bool(
                    row.get("financing_required")
                ),
                intent=row.get("intent") or None,
                deal_value=safe_float(
                    row.get("deal_value")
                ),
            )

            db.add(lead)
            db.flush()

            existing_phones.add(phone)
            created += 1

        except Exception as exc:
            db.rollback()

            errors.append(
                {
                    "row": row_number,
                    "error": str(exc),
                }
            )

    db.commit()

    return {
        "created": created,
        "skipped": skipped,
        "errors": errors,
    }


# =========================================================
# BULK UPDATE
# MANAGER / ADMIN
# =========================================================

class BulkLeadUpdateRequest(BaseModel):
    lead_ids: list[int]
    status: str | None = None
    temperature: str | None = None
    source: str | None = None


@router.patch("/leads/bulk-update")
def bulk_update_leads(
    payload: BulkLeadUpdateRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    if not payload.lead_ids:
        raise HTTPException(
            status_code=400,
            detail="At least one lead ID is required.",
        )

    leads = (
        db.query(Lead)
        .filter(
            Lead.id.in_(payload.lead_ids)
        )
        .all()
    )

    if not leads:
        raise HTTPException(
            status_code=404,
            detail="No matching leads found.",
        )

    updated = 0

    for lead in leads:

        if payload.status is not None:
            lead.status = normalize_status(
                payload.status
            )

        if payload.temperature is not None:
            temperature = normalize_temperature(
                payload.temperature
            )

            if temperature:
                lead.temperature = temperature

        if payload.source is not None:
            lead.source = (
                payload.source.strip()
                or None
            )

        updated += 1

    db.commit()

    return {
        "updated": updated,
        "lead_ids": [
            lead.id
            for lead in leads
        ],
    }


# =========================================================
# DUPLICATE DETECTION
# MANAGER / ADMIN
# =========================================================

@router.get("/leads/duplicates")
def detect_duplicates(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    leads = (
        db.query(Lead)
        .order_by(Lead.id.asc())
        .all()
    )

    phone_groups = {}
    email_groups = {}

    for lead in leads:

        if lead.phone:
            phone = (
                str(lead.phone)
                .replace(" ", "")
                .replace("-", "")
                .strip()
            )

            if phone:
                phone_groups.setdefault(
                    phone,
                    [],
                ).append(lead.id)

        if lead.email:
            email = (
                str(lead.email)
                .strip()
                .lower()
            )

            if email:
                email_groups.setdefault(
                    email,
                    [],
                ).append(lead.id)

    duplicates = []

    for phone, ids in phone_groups.items():
        if len(ids) > 1:
            duplicates.append(
                {
                    "match_type": "PHONE",
                    "value": phone,
                    "lead_ids": ids,
                }
            )

    for email, ids in email_groups.items():
        if len(ids) > 1:
            duplicates.append(
                {
                    "match_type": "EMAIL",
                    "value": email,
                    "lead_ids": ids,
                }
            )

    return {
        "total_duplicate_groups": len(
            duplicates
        ),
        "duplicates": duplicates,
    }


# =========================================================
# AUDIT LOG
# MANAGER / ADMIN
# =========================================================

@router.get("/audit-logs")
def get_audit_logs(
    lead_id: int | None = Query(
        default=None
    ),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    query = (
        db.query(AuditLog)
        .order_by(
            AuditLog.created_at.desc()
        )
    )

    if lead_id is not None:
        query = query.filter(
            AuditLog.lead_id == lead_id
        )

    logs = query.limit(limit).all()

    return {
        "logs": [
            {
                "id": item.id,
                "lead_id": item.lead_id,
                "action": item.action,
                "description": item.description,
                "created_at": item.created_at,
            }
            for item in logs
        ]
    }


# =========================================================
# NOTIFICATIONS
# ALL AUTHENTICATED USERS
# =========================================================

@router.get("/notifications")
def get_notifications(
    unread_only: bool = False,
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    db: Session = Depends(get_db),
    _: User = Depends(require_sales),
):
    query = (
        db.query(Notification)
        .order_by(
            Notification.created_at.desc()
        )
    )

    if unread_only:
        query = query.filter(
            Notification.is_read == False
        )

    notifications = (
        query
        .limit(limit)
        .all()
    )

    return {
        "unread_count": (
            db.query(Notification)
            .filter(
                Notification.is_read == False
            )
            .count()
        ),
        "notifications": [
            {
                "id": item.id,
                "lead_id": item.lead_id,
                "type": item.notification_type,
                "priority": item.priority,
                "title": item.title,
                "message": item.message,
                "is_read": item.is_read,
                "created_at": item.created_at,
            }
            for item in notifications
        ],
    }


# =========================================================
# MARK NOTIFICATION READ
# ALL AUTHENTICATED USERS
# =========================================================

@router.patch(
    "/notifications/{notification_id}/read"
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_sales),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found.",
        )

    notification.is_read = True

    db.commit()
    db.refresh(notification)

    return {
        "success": True,
        "id": notification.id,
        "is_read": notification.is_read,
    }


# =========================================================
# GENERATE SALES NOTIFICATIONS
# MANAGER / ADMIN
# =========================================================

@router.post("/notifications/generate")
def generate_notifications(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    created = []

    now = datetime.utcnow()

    # -----------------------------------------------------
    # HOT LEADS
    # -----------------------------------------------------

    hot_leads = (
        db.query(Lead)
        .filter(
            Lead.temperature == "HOT"
        )
        .all()
    )

    for lead in hot_leads:

        existing = (
            db.query(Notification)
            .filter(
                Notification.lead_id == lead.id,
                Notification.notification_type
                == "HOT_LEAD",
                Notification.is_read == False,
            )
            .first()
        )

        if existing:
            continue

        notification = Notification(
            lead_id=lead.id,
            notification_type="HOT_LEAD",
            priority="HIGH",
            title="Hot lead requires attention",
            message=(
                f"{lead.name or 'Lead'} "
                f"is marked HOT with score "
                f"{lead.score or 0}."
            ),
        )

        db.add(notification)
        created.append(notification)

    # -----------------------------------------------------
    # OVERDUE FOLLOW-UPS
    # -----------------------------------------------------

    overdue_followups = (
        db.query(FollowUp, Lead)
        .join(
            Lead,
            Lead.id == FollowUp.lead_id,
        )
        .filter(
            FollowUp.status == "PENDING",
            FollowUp.scheduled_at <= now,
        )
        .all()
    )

    for follow_up, lead in overdue_followups:

        existing = (
            db.query(Notification)
            .filter(
                Notification.lead_id == lead.id,
                Notification.notification_type
                == "OVERDUE_FOLLOW_UP",
                Notification.is_read == False,
            )
            .first()
        )

        if existing:
            continue

        notification = Notification(
            lead_id=lead.id,
            notification_type="OVERDUE_FOLLOW_UP",
            priority="HIGH",
            title="Follow-up overdue",
            message=(
                f"Follow-up for "
                f"{lead.name or 'lead'} "
                f"is overdue."
            ),
        )

        db.add(notification)
        created.append(notification)

    # -----------------------------------------------------
    # NEW LEADS
    # -----------------------------------------------------

    recent_threshold = now - timedelta(
        hours=24
    )

    recent_leads = (
        db.query(Lead)
        .filter(
            Lead.created_at >= recent_threshold
        )
        .all()
    )

    for lead in recent_leads:

        existing = (
            db.query(Notification)
            .filter(
                Notification.lead_id == lead.id,
                Notification.notification_type
                == "NEW_LEAD",
            )
            .first()
        )

        if existing:
            continue

        notification = Notification(
            lead_id=lead.id,
            notification_type="NEW_LEAD",
            priority="MEDIUM",
            title="New lead received",
            message=(
                f"New lead from "
                f"{lead.source or 'unknown source'}: "
                f"{lead.name or lead.phone}."
            ),
        )

        db.add(notification)
        created.append(notification)

    db.commit()

    return {
        "created": len(created),
    }


# =========================================================
# TEAM PERFORMANCE
# MANAGER / ADMIN
# =========================================================

@router.get("/team-performance")
def team_performance(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    """
    Uses lead.source as the salesperson/owner
    when an explicit owner system is not yet present.

    You can replace this later with assigned_to.
    """

    leads = (
        db.query(Lead)
        .order_by(Lead.created_at.desc())
        .all()
    )

    grouped = {}

    for lead in leads:

        owner = (
            getattr(
                lead,
                "assigned_to",
                None,
            )
            or "UNASSIGNED"
        )

        owner = str(owner).strip()

        if not owner:
            owner = "UNASSIGNED"

        if owner not in grouped:
            grouped[owner] = {
                "salesperson": owner,
                "total_leads": 0,
                "active_leads": 0,
                "converted_leads": 0,
                "lost_leads": 0,
                "revenue": 0.0,
            }

        item = grouped[owner]

        item["total_leads"] += 1

        lead_status = normalize_status(
            lead.status
        )

        if lead_status == "CONVERTED":
            item["converted_leads"] += 1
            item["revenue"] += float(
                lead.deal_value or 0
            )

        elif lead_status == "LOST":
            item["lost_leads"] += 1

        else:
            item["active_leads"] += 1

    for item in grouped.values():

        total = item["total_leads"]

        item["conversion_rate"] = round(
            (
                item["converted_leads"]
                / total
                * 100
            )
            if total
            else 0,
            2,
        )

        item["revenue"] = round(
            item["revenue"],
            2,
        )

    result = list(
        grouped.values()
    )

    result.sort(
        key=lambda item: (
            item["revenue"],
            item["converted_leads"],
            item["total_leads"],
        ),
        reverse=True,
    )

    return {
        "team": result,
    }


# =========================================================
# REVENUE SUMMARY BY DATE
# MANAGER / ADMIN
# =========================================================

@router.get("/revenue-summary")
def revenue_summary(
    from_date: date = Query(...),
    to_date: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    if from_date > to_date:
        raise HTTPException(
            status_code=400,
            detail=(
                "from_date cannot be greater "
                "than to_date."
            ),
        )

    start_datetime = datetime.combine(
        from_date,
        datetime.min.time(),
    )

    end_datetime = datetime.combine(
        to_date,
        datetime.max.time(),
    )

    converted = (
        db.query(Lead)
        .filter(
            Lead.status == "CONVERTED",
            Lead.conversion_date >= start_datetime,
            Lead.conversion_date <= end_datetime,
        )
        .all()
    )

    revenue = sum(
        float(lead.deal_value or 0)
        for lead in converted
    )

    average = (
        revenue / len(converted)
        if converted
        else 0
    )

    return {
        "from_date": str(from_date),
        "to_date": str(to_date),
        "converted_leads": len(converted),
        "total_revenue": round(
            revenue,
            2,
        ),
        "average_deal_value": round(
            average,
            2,
        ),
    }


# =========================================================
# CRM SUMMARY
# MANAGER / ADMIN
# =========================================================

@router.get("/crm-summary")
def crm_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    leads = (
        db.query(Lead)
        .all()
    )

    total = len(leads)

    converted = sum(
        1
        for lead in leads
        if normalize_status(
            lead.status
        ) == "CONVERTED"
    )

    lost = sum(
        1
        for lead in leads
        if normalize_status(
            lead.status
        ) == "LOST"
    )

    revenue = sum(
        float(lead.deal_value or 0)
        for lead in leads
        if normalize_status(
            lead.status
        ) == "CONVERTED"
    )

    return {
        "total_leads": total,
        "active_leads": (
            total - converted - lost
        ),
        "converted_leads": converted,
        "lost_leads": lost,
        "conversion_rate": round(
            (
                converted / total * 100
            )
            if total
            else 0,
            2,
        ),
        "total_revenue": round(
            revenue,
            2,
        ),
    }

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.created_at.desc())
        .limit(min(limit, 500))
        .all()
    )

    return [
        {
            "id": log.id,
            "lead_id": log.lead_id,
            "action": log.action,
            "description": log.description,
            "created_at": log.created_at,
        }
        for log in logs
    ]