from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.lead import (
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from backend.app.services.lead_service import (
    create_lead,
    delete_lead,
    get_lead,
    get_leads,
    update_lead,
)


router = APIRouter(
    prefix="/leads",
    tags=["Leads"],
)


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
):
    return create_lead(db, lead_data)


@router.get(
    "",
    response_model=list[LeadResponse],
)
def list_all_leads(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return get_leads(
        db,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_single_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = get_lead(db, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return lead


@router.patch(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_existing_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
):
    lead = get_lead(db, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return update_lead(
        db,
        lead,
        lead_data,
    )


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = get_lead(db, lead_id)

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    delete_lead(db, lead)

    return None