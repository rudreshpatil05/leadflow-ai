from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.lead_activity import LeadActivityCreate, LeadActivityResponse
from backend.app.services.lead_activity_service import (
    create_activity,
    get_lead_activities,
)


router = APIRouter(
    prefix="/activities",
    tags=["Lead Activities"],
)


@router.post(
    "/",
    response_model=LeadActivityResponse,
)
def create_lead_activity(
    activity: LeadActivityCreate,
    db: Session = Depends(get_db),
):
    return create_activity(
        db=db,
        activity=activity,
    )


@router.get(
    "/lead/{lead_id}",
    response_model=list[LeadActivityResponse],
)
def get_activities_for_lead(
    lead_id: int,
    db: Session = Depends(get_db),
):
    return get_lead_activities(
        db=db,
        lead_id=lead_id,
    )