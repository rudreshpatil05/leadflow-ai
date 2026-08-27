from sqlalchemy import select
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
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


def get_lead(
    db: Session,
    lead_id: int,
) -> Lead | None:

    statement = select(Lead).where(Lead.id == lead_id)

    return db.scalar(statement)


def get_leads(
    db: Session,
    skip: int = 0,
    limit: int = 50,
) -> list[Lead]:

    statement = (
        select(Lead)
        .offset(skip)
        .limit(limit)
        .order_by(Lead.created_at.desc())
    )

    return list(db.scalars(statement).all())


def update_lead(
    db: Session,
    lead: Lead,
    lead_data: LeadUpdate,
) -> Lead:

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
    lead: Lead,
) -> None:

    db.delete(lead)
    db.commit()