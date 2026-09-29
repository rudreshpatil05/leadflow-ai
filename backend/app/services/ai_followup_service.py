import json
import os

from google import genai


class AIFollowUpService:
    """
    Generates AI-powered follow-up messages for leads.
    """

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured."
            )

        self.client = genai.Client(
            api_key=self.api_key
        )

    def generate_message(self, lead):
        prompt = f"""
You are an AI sales assistant for a real estate CRM.

Generate a concise, professional follow-up message for this lead.

Lead information:
Name: {lead.name or "Customer"}
Phone: {lead.phone or ""}
Source: {lead.source or ""}
Status: {lead.status or ""}
Temperature: {lead.temperature or ""}
Score: {lead.score or 0}
Property Type: {lead.property_type or ""}
Configuration: {lead.configuration or ""}
Location: {lead.location or ""}
Budget Minimum: {lead.budget_min or ""}
Budget Maximum: {lead.budget_max or ""}
Timeline: {lead.timeline or ""}
Purpose: {lead.purpose or ""}
Down Payment: {lead.down_payment or ""}
Financing Required: {lead.financing_required}
Intent: {lead.intent or ""}
Notes: {lead.notes or ""}

Return ONLY valid JSON in this exact structure:

{{
  "message": "short personalized follow-up message",
  "reason": "why this follow-up is appropriate",
  "channel": "WHATSAPP"
}}

Rules:
- Keep the message short and natural.
- Do not invent property details.
- Do not mention that AI generated the message.
- Do not use markdown.
- Use INR when discussing money.
- Prefer WhatsApp unless another channel is clearly more appropriate.
"""

        response = self.client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
        )

        text = (response.text or "").strip()

        if text.startswith("```"):
            text = text.replace("```json", "")
            text = text.replace("```", "")
            text = text.strip()

        return json.loads(text)