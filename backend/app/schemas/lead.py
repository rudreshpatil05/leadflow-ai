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

    class Config:
        from_attributes = True