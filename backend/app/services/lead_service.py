from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.schemas.lead import LeadCreate, LeadUpdate


def create_lead(
    db: Session,
    lead_data: LeadCreate,
) -> Lead:

    lead = Lead(
        **lead_data.model_dump()
    )

    db.add(lead)
    db.commit()
    db.refresh(lead)

    return lead


def get_lead(
    db: Session,
    lead_id: int,
) -> Lead | None:

    return db.get(Lead, lead_id)


def get_leads(
    db: Session,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    temperature: str | None = None,
    status: str | None = None,
    source: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    """
    Retrieve leads with search, filtering,
    sorting and pagination.
    """

    query = select(Lead)

    # -------------------------
    # SEARCH
    # -------------------------

    if search:

        pattern = f"%{search}%"

        query = query.where(
            or_(
                Lead.name.like(pattern),
                Lead.phone.like(pattern),
                Lead.email.like(pattern),
            )
        )

    # -------------------------
    # TEMPERATURE
    # -------------------------

    if temperature:

        query = query.where(
            Lead.temperature == temperature
        )

    # -------------------------
    # STATUS
    # -------------------------

    if status:

        query = query.where(
            Lead.status == status
        )

    # -------------------------
    # SOURCE
    # -------------------------

    if source:

        query = query.where(
            Lead.source == source
        )

    # -------------------------
    # COUNT
    # -------------------------

    count_query = select(
        func.count()
    ).select_from(
        query.subquery()
    )

    total = db.scalar(count_query) or 0

    # -------------------------
    # SORTING
    # -------------------------

    allowed_sort_fields = {
        "created_at": Lead.created_at,
        "score": Lead.score,
        "name": Lead.name,
        "temperature": Lead.temperature,
        "status": Lead.status,
    }

    sort_column = allowed_sort_fields.get(
        sort_by,
        Lead.created_at,
    )

    if sort_order.lower() == "asc":

        query = query.order_by(
            sort_column.asc()
        )

    else:

        query = query.order_by(
            sort_column.desc()
        )

    # -------------------------
    # PAGINATION
    # -------------------------

    offset = (page - 1) * page_size

    query = (
        query
        .offset(offset)
        .limit(page_size)
    )

    leads = db.scalars(query).all()

    return leads, total


def update_lead(
    db: Session,
    lead_id: int,
    lead_data: LeadUpdate,
) -> Lead | None:

    lead = db.get(
        Lead,
        lead_id
    )

    if not lead:
        return None

    update_data = lead_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():

        setattr(
            lead,
            field,
            value
        )

    db.commit()
    db.refresh(lead)

    return lead


def delete_lead(
    db: Session,
    lead_id: int,
) -> bool:

    lead = db.get(
        Lead,
        lead_id
    )

    if not lead:
        return False

    db.delete(lead)
    db.commit()

    return True