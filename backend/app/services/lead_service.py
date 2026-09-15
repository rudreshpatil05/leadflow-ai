from sqlalchemy.orm import Session
from sqlalchemy import or_

from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.schemas.lead import LeadCreate, LeadUpdate


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

    old_status = lead.status

    update_data = lead_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    new_status = lead.status

    # Record status changes
    if (
        "status" in update_data
        and old_status != new_status
    ):
        activity = LeadActivity(
            lead_id=lead.id,
            activity_type="STATUS_CHANGED",
            description=(
                f"Lead moved from "
                f"{old_status or 'NEW'} "
                f"to "
                f"{new_status}."
            ),
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

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