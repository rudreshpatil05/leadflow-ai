import json

from google.genai import types

from backend.app.ai.extraction import client
from backend.app.core.config import settings
from backend.app.models.lead import Lead


def generate_sales_copilot(lead: Lead):
    prompt = f"""
You are an AI sales copilot for a real estate sales team.

Analyze the lead information below and help the salesperson decide
how to handle this lead.

LEAD INFORMATION:
Name: {lead.name}
Phone: {lead.phone}
Source: {lead.source}

AI QUALIFICATION:
Score: {lead.score}
Temperature: {lead.temperature}
Intent: {lead.intent}

PROPERTY REQUIREMENTS:
Property Type: {lead.property_type}
Configuration: {lead.configuration}
Location: {lead.location}
Budget Minimum: {lead.budget_min}
Budget Maximum: {lead.budget_max}
Currency: {lead.currency}
Timeline: {lead.timeline}
Purpose: {lead.purpose}
Down Payment: {lead.down_payment}
Financing Required: {lead.financing_required}

QUALIFICATION REASONS:
{lead.qualification_reasons}

NEXT BEST ACTION:
{lead.next_best_action}

IMPORTANT RULES:
1. Never invent property details.
2. Never invent prices or availability.
3. Use only information provided above.
4. If information is missing, do not make it up.
5. Keep recommendations practical for a real estate salesperson.
6. Make the WhatsApp message natural and professional.
7. Do not make unrealistic promises.

Return ONLY valid JSON in this exact format:

{{
    "summary": "Short summary of the lead",
    "talking_points": [
        "Talking point 1",
        "Talking point 2",
        "Talking point 3"
    ],
    "sales_strategy": "Recommended strategy for the salesperson",
    "whatsapp_message": "Personalized WhatsApp message to the lead",
    "priority": "HIGH"
}}
"""

    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    text = response.text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)