from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.schemas.lead import LeadCreate, LeadUpdate


PIPELINE_STAGES = {
    "NEW",
    "QUALIFIED",
    "CONTACTED",
    "INTERESTED",
    "SITE_VISIT",
    "NEGOTIATION",
    "CONVERTED",
    "LOST",
}


def create_lead(
    db: Session,
    lead_data: LeadCreate,
) -> Lead:
    lead = Lead(
        name=lead_data.name,
        phone=lead_data.phone,
        email=lead_data.email,
        source=lead_data.source,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


def get_lead(
    db: Session,
    lead_id: int,
):
    return (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )


def get_leads(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    temperature: str | None = None,
    status: str | None = None,
    source: str | None = None,
):
    query = db.query(Lead)

    if search:
        search_term = f"%{search}%"

        query = query.filter(
            or_(
                Lead.name.ilike(search_term),
                Lead.phone.ilike(search_term),
                Lead.email.ilike(search_term),
                Lead.location.ilike(search_term),
                Lead.configuration.ilike(search_term),
            )
        )

    if temperature:
        query = query.filter(
            Lead.temperature == temperature
        )

    if status:
        query = query.filter(
            Lead.status == status
        )

    if source:
        query = query.filter(
            Lead.source == source
        )

    total = query.count()

    leads = (
        query
        .order_by(Lead.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return leads, total


def update_lead(
    db: Session,
    lead_id: int,
    lead_data: LeadUpdate,
):
    lead = get_lead(
        db=db,
        lead_id=lead_id,
    )

    if lead is None:
        return None

    old_status = (
        str(lead.status or "NEW")
        .upper()
    )

    update_data = lead_data.model_dump(
        exclude_unset=True
    )

    new_status = old_status

    if "status" in update_data:
        new_status = str(
            update_data["status"] or old_status
        ).upper()

        update_data["status"] = new_status.lower()

    # =========================================================
    # CONVERSION LOGIC
    # =========================================================

    if new_status == "CONVERTED":

        if (
            "deal_value" in update_data
            and update_data["deal_value"] is not None
            and update_data["deal_value"] <= 0
        ):
            raise ValueError(
                "Deal value must be greater than zero."
            )

        if not lead.conversion_date:
            update_data["conversion_date"] = (
                datetime.utcnow()
            )

        # A converted lead cannot remain marked as lost.
        update_data["lost_date"] = None
        update_data["lost_reason"] = None
        update_data["lost_notes"] = None

    # =========================================================
    # LOST LEAD LOGIC
    # =========================================================

    elif new_status == "LOST":

        lost_reason = update_data.get(
            "lost_reason",
            lead.lost_reason,
        )

        if not lost_reason or not str(
            lost_reason
        ).strip():
            raise ValueError(
                "Lost reason is required."
            )

        if not lead.lost_date:
            update_data["lost_date"] = (
                datetime.utcnow()
            )

        # A lost lead cannot remain marked as converted.
        update_data["conversion_date"] = None
        update_data["deal_value"] = None
        update_data["conversion_notes"] = None

    # =========================================================
    # NORMAL PIPELINE STAGES
    # =========================================================

    elif new_status in PIPELINE_STAGES:

        # If a previously converted/lost lead is moved
        # back into the active pipeline, clear terminal data.
        if old_status in {"CONVERTED", "LOST"}:
            update_data["conversion_date"] = None
            update_data["deal_value"] = None
            update_data["conversion_notes"] = None

            update_data["lost_date"] = None
            update_data["lost_reason"] = None
            update_data["lost_notes"] = None

    # =========================================================
    # APPLY UPDATE
    # =========================================================

    for field, value in update_data.items():
        setattr(lead, field, value)

    # =========================================================
    # STATUS ACTIVITY
    # =========================================================

    status_changed = (
        old_status != new_status
    )

    if status_changed:

        activity = LeadActivity(
            lead_id=lead.id,
            activity_type="STATUS_CHANGED",
            description=(
                f"Lead moved from "
                f"{old_status} "
                f"to "
                f"{new_status}."
            ),
        )

        db.add(activity)

    # =========================================================
    # CONVERSION ACTIVITY
    # =========================================================

    if (
        status_changed
        and new_status == "CONVERTED"
    ):
        deal_value = lead.deal_value

        activity = LeadActivity(
            lead_id=lead.id,
            activity_type="LEAD_CONVERTED",
            description=(
                "Lead converted successfully."
                + (
                    f" Deal value: ₹{deal_value:,.0f}."
                    if deal_value is not None
                    else ""
                )
            ),
        )

        db.add(activity)

    # =========================================================
    # LOST ACTIVITY
    # =========================================================

    if (
        status_changed
        and new_status == "LOST"
    ):
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type="LEAD_LOST",
            description=(
                "Lead marked as lost."
                + (
                    f" Reason: {lead.lost_reason}."
                    if lead.lost_reason
                    else ""
                )
            ),
        )

        db.add(activity)

    db.commit()
    db.refresh(lead)

    return lead


def delete_lead(
    db: Session,
    lead_id: int,
):
    lead = get_lead(
        db=db,
        lead_id=lead_id,
    )

    if lead is None:
        return False

    db.delete(lead)
    db.commit()

    return True

