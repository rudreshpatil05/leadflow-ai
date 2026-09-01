from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from math import ceil
from backend.app.schemas.qualification import LeadQualificationRequest
from fastapi import Query

from backend.app.services.lead_qualification_service import qualify_and_save_lead
from backend.app.services.lead_service import get_leads
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


@router.post("/{lead_id}/qualify")
def qualify_lead(
    lead_id: int,
    request: LeadQualificationRequest,
    db: Session = Depends(get_db)
):
    return qualify_and_save_lead(
        db=db,
        lead_id=lead_id,
        message=request.message
    )

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

@router.post("/qualify")
def qualify_lead(
    payload: LeadQualificationRequest,
    db: Session = Depends(get_db)
):
    return qualify_and_save_lead(
        db=db,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        source=payload.source,
        message=payload.message,
    )