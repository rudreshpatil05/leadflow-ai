from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LeadCreate(BaseModel):
    name: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str = Field(
        min_length=7,
        max_length=30,
    )

    email: EmailStr | None = None

    source: str | None = Field(
        default=None,
        max_length=50,
    )


class LeadUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        max_length=150,
    )

    phone: str | None = Field(
        default=None,
        min_length=7,
        max_length=30,
    )

    email: EmailStr | None = None

    source: str | None = Field(
        default=None,
        max_length=50,
    )

    status: str | None = Field(
        default=None,
        max_length=30,
    )

    temperature: str | None = Field(
        default=None,
        max_length=30,
    )

    score: int | None = Field(
        default=None,
        ge=0,
        le=100,
    )

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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )