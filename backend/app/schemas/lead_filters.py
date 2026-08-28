from typing import Optional

from pydantic import BaseModel


class LeadListResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int