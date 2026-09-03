import json

from sqlalchemy.orm import Session

from backend.app.ai.extraction import extract_lead_requirements
from backend.app.services.qualification_scoring import calculate_score
from backend.app.models.lead import Lead


def qualify_and_save_lead(
    db: Session,
    lead: Lead,
    message: str,
):
    """
    Extract customer requirements using AI,
    calculate qualification score,
    and save the result to the lead.
    """

    # Step 1: Extract structured requirements using AI
    requirements = extract_lead_requirements(message)

    # Step 2: Calculate qualification score
    qualification = calculate_score(requirements)

    # Step 3: Update lead with extracted information
    lead.score = qualification.score
    lead.temperature = qualification.temperature

    # Step 4: Store AI intent
    lead.intent = requirements.intent
    # Step 5: Store extracted requirements
    lead.property_type = requirements.property_type
    lead.configuration = requirements.configuration
    lead.location = requirements.location

    lead.budget_min = requirements.budget.min_amount
    lead.budget_max = requirements.budget.max_amount
    lead.currency = requirements.budget.currency

    lead.timeline = requirements.timeline
    lead.purpose = requirements.purpose
    lead.down_payment = requirements.down_payment
    lead.financing_required = requirements.financing_required

    # Step 5: Store explanation
    lead.qualification_reasons = json.dumps(
        qualification.reasons
    )

    # Step 6: Store next action
    lead.next_best_action = qualification.next_best_action

    # Step 7: Save changes
    db.add(lead)
    db.commit()
    db.refresh(lead)

    return {
        "lead": lead,
        "requirements": requirements,
        "qualification": qualification,
    }