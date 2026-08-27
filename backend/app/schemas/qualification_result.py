from pydantic import BaseModel, Field


class QualificationResult(BaseModel):
    score: int = Field(
        ge=0,
        le=100,
        description="Lead qualification score from 0 to 100."
    )

    temperature: str = Field(
        description="HOT, WARM, COLD, or NOT QUALIFIED."
    )

    missing_fields: list[str] = Field(
        default_factory=list
    )

    next_question: str | None = None

    next_best_action: str

    reasoning: list[str] = Field(
        default_factory=list
    )