from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
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
        status="new",
        temperature="COLD",
        score=0,
        notes=lead_data.message,
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


def get_lead(
    db: Session,
    lead_id: int,
) -> Lead | None:

    return (
        db.query(Lead)
        .filter(Lead.id == lead_id)
        .first()
    )


def get_leads(
    db: Session,
    temperature: str | None = None,
    status: str | None = None,
    source: str | None = None,
    location: str | None = None,
) -> list[Lead]:

    query = db.query(Lead)

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

    if location:
        query = query.filter(
            Lead.location == location
        )

    return (
        query
        .order_by(Lead.created_at.desc())
        .all()
    )


def update_lead(
    db: Session,
    lead_id: int,
    lead_data: LeadUpdate,
) -> Lead | None:

    lead = get_lead(db, lead_id)

    if not lead:
        return None

    update_data = lead_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(lead, field, value)

    db.commit()
    db.refresh(lead)

    return lead


def delete_lead(
    db: Session,
    lead_id: int,
) -> bool:

    lead = get_lead(db, lead_id)

    if not lead:
        return False

    db.delete(lead)
    db.commit()

    return True