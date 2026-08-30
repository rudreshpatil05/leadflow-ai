from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LeadActivityCreate(BaseModel):
    lead_id: int
    activity_type: str
    description: str | None = None


class LeadActivityResponse(BaseModel):
    id: int
    lead_id: int
    activity_type: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)