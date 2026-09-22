from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


class LeadCreate(BaseModel):
    name: str | None = None
    phone: str
    email: EmailStr | None = None
    source: str | None = None
    status: str | None = "new"
    temperature: str | None = None
    score: int | None = 0
    notes: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    source: str | None = None
    status: str | None = None
    temperature: str | None = None
    notes: str | None = None

    # Conversion
    conversion_date: datetime | None = None
    deal_value: float | None = None
    conversion_notes: str | None = None

    # Lost lead
    lost_date: datetime | None = None
    lost_reason: str | None = None
    lost_notes: str | None = None


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str | None
    phone: str
    email: str | None
    source: str | None
    status: str
    temperature: str | None
    score: int
    notes: str | None

    # AI extracted requirements
    property_type: str | None
    configuration: str | None
    location: str | None
    budget_min: float | None
    budget_max: float | None
    currency: str | None
    timeline: str | None
    purpose: str | None
    down_payment: float | None
    financing_required: bool | None

    # AI qualification
    qualification_reasons: str | None
    intent: str | None
    next_best_action: str | None

    # Conversion
    conversion_date: datetime | None
    deal_value: float | None
    conversion_notes: str | None

    # Lost lead
    lost_date: datetime | None
    lost_reason: str | None
    lost_notes: str | None

    created_at: datetime
    updated_at: datetime