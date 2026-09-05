import json

from sqlalchemy.orm import Session

from backend.app.ai.extraction import extract_lead_requirements
from backend.app.services.qualification_scoring import calculate_score
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity


def qualify_and_save_lead(
    db: Session,
    lead: Lead,
    message: str,
):
    """
    Extract customer requirements using AI,
    calculate qualification score,
    save the result to the lead,
    and create an activity record.
    """

    # Step 1: Extract structured requirements using AI
    requirements = extract_lead_requirements(message)

    # Step 2: Calculate qualification score
    qualification = calculate_score(requirements)

    # Step 3: Update lead with qualification score
    lead.score = qualification.score
    lead.temperature = qualification.temperature

    # Step 4: Store AI intent
    lead.intent = requirements.intent

    # Step 5: Store extracted requirements
    lead.property_type = requirements.property_type
    lead.configuration = requirements.configuration
    lead.location = requirements.location

    # Budget
    lead.budget_min = requirements.budget.min_amount
    lead.budget_max = requirements.budget.max_amount
    lead.currency = requirements.budget.currency

    # Other requirements
    lead.timeline = requirements.timeline
    lead.purpose = requirements.purpose
    lead.down_payment = requirements.down_payment
    lead.financing_required = requirements.financing_required

    # Step 6: Store qualification reasons
    lead.qualification_reasons = json.dumps(
        qualification.reasons
    )

    # Step 7: Store next best action
    lead.next_best_action = qualification.next_best_action

    # Step 8: Save updated lead
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Step 9: Automatically create activity
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type="AI_QUALIFICATION",
        description=(
            f"Lead qualified as "
            f"{qualification.temperature} "
            f"with score {qualification.score}."
        ),
    )

    # Step 10: Save activity
    db.add(activity)
    db.commit()
    db.refresh(activity)

    # Step 11: Return complete result
    return {
        "lead": lead,
        "requirements": requirements,
        "qualification": qualification,
        "activity": activity,
    }