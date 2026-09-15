from pydantic import BaseModel, Field


class LeadQualificationRequest(BaseModel):
    message: str = Field(
        ...,
        min_length=1,
        description="Customer message used for AI lead qualification."
    )


class Budget(BaseModel):
    min_amount: float | None = Field(
        default=None,
        description="Minimum budget in INR."
    )

    max_amount: float | None = Field(
        default=None,
        description="Maximum budget in INR."
    )

    currency: str = Field(
        default="INR",
        description="Currency code."
    )


class LeadRequirements(BaseModel):
    property_type: str | None = None
    configuration: str | None = None
    location: str | None = None
    budget: Budget = Field(default_factory=Budget)
    timeline: str | None = None
    purpose: str | None = None
    down_payment: float | None = None
    financing_required: bool | None = None
    intent: str | None = None