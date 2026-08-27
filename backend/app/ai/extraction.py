from google import genai
from google.genai import types

from backend.app.core.config import settings
from backend.app.schemas.qualification import LeadRequirements


client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


SYSTEM_PROMPT = """
You are an AI real-estate lead qualification assistant.

Extract structured buying requirements from the customer's
natural-language message.

Rules:

1. Never invent information.
2. If information is missing, return null.
3. Convert Indian currency expressions into INR.
4. 1 crore = 10,000,000 INR.
5. 1 lakh = 100,000 INR.
6. Identify configurations such as 1BHK, 2BHK, 3BHK.
7. Identify preferred location.
8. Identify buying timeline.
9. Identify whether the property is for self-use or investment.
10. Extract down payment information when provided.
11. Determine financing requirement only when there is sufficient evidence.
12. Estimate buying intent only from evidence in the message.
"""


def extract_lead_requirements(
    message: str,
) -> LeadRequirements:

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            SYSTEM_PROMPT,
            f"Customer message:\n{message}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=LeadRequirements,
        ),
    )

    return LeadRequirements.model_validate_json(
        response.text
    )