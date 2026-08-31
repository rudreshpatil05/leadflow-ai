from pydantic import BaseModel, Field


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
    property_type: str | None = Field(
        default=None,
        description="Property category such as residential, commercial, or plot."
    )

    configuration: str | None = Field(
        default=None,
        description="Property configuration such as 1BHK, 2BHK, or 3BHK."
    )

    location: str | None = Field(
        default=None,
        description="Preferred property location."
    )

    budget: Budget = Field(
        default_factory=Budget,
        description="Customer budget."
    )

    timeline: str | None = Field(
        default=None,
        description="Expected purchase timeline."
    )

    purpose: str | None = Field(
        default=None,
        description="Purpose such as self-use or investment."
    )

    down_payment: float | None = Field(
        default=None,
        description="Available down payment in INR."
    )

    financing_required: bool | None = Field(
        default=None,
        description="Whether the customer appears to require financing."
    )

    intent: str | None = Field(
        default=None,
        description="Estimated buying intent."
    )

class LeadQualificationRequest(BaseModel):
    lead_id: int
    message: str = Field(
        ...,
        min_length=1,
        description="Customer's message containing their property requirements."
    )