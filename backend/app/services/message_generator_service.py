import json

from google.genai import types

from backend.app.ai.extraction import client
from backend.app.core.config import settings
from backend.app.models.lead import Lead


MESSAGE_TYPES = {
    "initial_follow_up": "Initial Follow-up",
    "whatsapp_follow_up": "WhatsApp Follow-up",
    "property_recommendation": "Property Recommendation",
    "site_visit": "Site Visit Invitation",
    "budget_discussion": "Price/Budget Discussion",
    "re_engagement": "Re-engagement",
    "post_site_visit": "Post Site-Visit Follow-up",
}


def generate_lead_message(
    lead: Lead,
    message_type: str,
) -> dict:

    if message_type not in MESSAGE_TYPES:
        raise ValueError(
            f"Unsupported message type: {message_type}"
        )

    message_type_name = MESSAGE_TYPES[message_type]

    prompt = f"""
You are an AI sales message generator for a professional
real-estate sales team in India.

Generate a personalized customer message based ONLY on the
information provided below.

MESSAGE TYPE:
{message_type_name}

LEAD INFORMATION:
Name: {lead.name}
Phone: {lead.phone}
Source: {lead.source}

QUALIFICATION:
Score: {lead.score}
Temperature: {lead.temperature}
Intent: {lead.intent}

PROPERTY REQUIREMENTS:
Property Type: {lead.property_type}
Configuration: {lead.configuration}
Location: {lead.location}
Minimum Budget: {lead.budget_min}
Maximum Budget: {lead.budget_max}
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
1. Never invent property names.
2. Never invent project names.
3. Never invent prices.
4. Never invent discounts.
5. Never invent availability.
6. Never invent amenities.
7. Never invent location details.
8. Use only information provided above.
9. If information is missing, write the message without that information.
10. Keep the message natural and human.
11. Keep the message suitable for WhatsApp.
12. Do not sound like a generic AI-generated message.
13. Do not use excessive emojis.
14. Use Indian English naturally.
15. Do not make unrealistic promises.
16. Do not mention the internal lead score or temperature to the customer.

MESSAGE TYPE INSTRUCTIONS:

Initial Follow-up:
Thank the customer for their enquiry and start a natural conversation.

WhatsApp Follow-up:
Create a concise follow-up message for an existing conversation.

Property Recommendation:
Create a message around matching the customer's stated property requirements.
Do not invent actual properties.

Site Visit Invitation:
Encourage the customer to schedule a site visit.
Do not invent a date, time, or project.

Price/Budget Discussion:
Create a professional message to discuss the customer's stated budget
and understand their expectations.

Re-engagement:
Create a polite message for a lead who has not responded recently.

Post Site-Visit Follow-up:
Create a message asking about the customer's feedback after a site visit.
Do not claim that a site visit happened unless the available information supports it.

Return ONLY valid JSON in this exact format:

{{
    "message_type": "{message_type_name}",
    "subject": "Short internal subject",
    "message": "Customer-facing WhatsApp message",
    "suggested_channel": "WHATSAPP",
    "sales_note": "Short internal note for the salesperson"
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
        text = (
            text.replace("```json", "")
            .replace("```", "")
            .strip()
        )

    return json.loads(text)