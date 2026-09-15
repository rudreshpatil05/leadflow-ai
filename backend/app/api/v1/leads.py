from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.lead import Lead
from backend.app.schemas.lead import (
    LeadCreate,
    LeadResponse,
    LeadUpdate,
)
from backend.app.schemas.qualification import LeadQualificationRequest
from backend.app.services.lead_service import (
    create_lead,
    delete_lead,
    get_lead,
    get_leads,
    update_lead,
)
from backend.app.services.lead_qualification_service import (
    qualify_and_save_lead,
)


router = APIRouter(
    prefix="/leads",
    tags=["Leads"],
)


# =========================================================
# CREATE LEAD
# =========================================================

@router.post(
    "/",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_new_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
):
    return create_lead(
        db=db,
        lead_data=lead_data,
    )


# =========================================================
# GET ALL LEADS
# =========================================================

@router.get("/")
def list_leads(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    temperature: str | None = Query(None),
    status: str | None = Query(None),
    source: str | None = Query(None),
):
    leads, total = get_leads(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        temperature=temperature,
        status=status,
        source=source,
    )

    total_pages = ceil(total / page_size) if total else 0

    return {
        "items": leads,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# =========================================================
# GET SINGLE LEAD
# =========================================================

@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
)
def get_single_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    lead = get_lead(
        db=db,
        lead_id=lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return lead


# =========================================================
# QUALIFY LEAD
# =========================================================

@router.post(
    "/{lead_id}/qualify",
)
def qualify_lead(
    lead_id: int,
    request: LeadQualificationRequest,
    db: Session = Depends(get_db),
):
    lead = get_lead(
        db=db,
        lead_id=lead_id,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return qualify_and_save_lead(
        db=db,
        lead=lead,
        message=request.message,
    )


# =========================================================
# UPDATE LEAD
# =========================================================

@router.patch(
    "/{lead_id}",
    response_model=LeadResponse,
)
def update_existing_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
):
    lead = update_lead(
        db=db,
        lead_id=lead_id,
        lead_data=lead_data,
    )

    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return lead


# =========================================================
# DELETE LEAD
# =========================================================

@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_existing_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    deleted = delete_lead(
        db=db,
        lead_id=lead_id,
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found",
        )

    return None