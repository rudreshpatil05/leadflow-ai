from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.core.auth import get_current_user
from backend.app.models.lead import Lead
from backend.app.models.user import User


def get_accessible_lead(
    lead_id: int,
    db: Session,
    current_user: User,
) -> Lead:
    query = db.query(Lead).filter(Lead.id == lead_id)

    role = str(current_user.role or "").strip().upper()

    if role == "SALES":
        query = query.filter(Lead.assigned_to == current_user.id)
    elif role not in {"ADMIN", "MANAGER"}:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this lead.",
        )

    lead = query.first()

    if lead is None:
        raise HTTPException(
            status_code=404,
            detail="Lead not found",
        )

    return lead


def require_accessible_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Lead:
    return get_accessible_lead(lead_id, db, current_user)
