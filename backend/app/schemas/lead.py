from pydantic import BaseModel, EmailStr, Field


class LeadCreate(BaseModel):
    name: str | None = None
    phone: str = Field(..., min_length=10, max_length=30)
    email: EmailStr | None = None
    source: str | None = None
    message: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    source: str | None = None
    status: str | None = None
    temperature: str | None = None
    notes: str | None = None


class LeadResponse(BaseModel):
    id: int
    name: str | None
    phone: str
    email: str | None
    source: str | None
    status: str
    temperature: str | None
    score: int
    notes: str | None

    # AI qualification
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

    intent: str | None
    qualification_reasons: str | None
    next_best_action: str | None

    class Config:
        from_attributes = True