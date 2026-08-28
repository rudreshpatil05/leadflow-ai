from pydantic import BaseModel


class QualificationResponse(BaseModel):

    lead_id: int

    score: int

    temperature: str

    intent: str | None

    next_best_action: str

    reasons: list[str]

    requirements: dict