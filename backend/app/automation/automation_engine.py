from sqlalchemy.orm import Session

from backend.app.models.lead import Lead


def run_lead_automation(
    db: Session,
    lead: Lead,
):
    """
    Run automation rules for a lead.

    Currently handles basic automation safely.
    This function is intentionally lightweight so the
    automation router can start without breaking the app.
    """

    if not lead:
        return {
            "success": False,
            "message": "Lead not found",
        }

    actions = []

    temperature = str(lead.temperature or "").upper()
    status = str(lead.status or "").upper()

    # HOT leads
    if temperature == "HOT" and status not in {"CONVERTED", "LOST"}:
        actions.append({
            "type": "PRIORITY",
            "action": "Immediate follow-up recommended",
            "channel": "PHONE",
        })

    # WARM leads
    elif temperature == "WARM" and status not in {"CONVERTED", "LOST"}:
        actions.append({
            "type": "FOLLOW_UP",
            "action": "Send property details and follow up",
            "channel": "WHATSAPP",
        })

    # COLD / other leads
    elif status not in {"CONVERTED", "LOST"}:
        actions.append({
            "type": "NURTURE",
            "action": "Continue lead nurturing",
            "channel": "WHATSAPP",
        })

    return {
        "success": True,
        "lead_id": lead.id,
        "actions": actions,
    }