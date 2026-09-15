import json

from sqlalchemy.orm import Session

from backend.app.ai.extraction import extract_lead_requirements
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.services.follow_up_service import create_follow_up
from backend.app.services.next_best_action_service import create_next_best_action
from backend.app.services.qualification_scoring import calculate_score


def qualify_and_save_lead(
    db: Session,
    lead: Lead,
    message: str,
):
    """
    Complete AI lead qualification pipeline.

    1. Extract customer requirements using AI
    2. Calculate qualification score
    3. Save qualification data to lead
    4. Create activity
    5. Create follow-up
    6. Create next best action
    7. Return complete result
    """

    # Step 1: Extract structured requirements using AI
    requirements = extract_lead_requirements(message)

    # Step 2: Calculate qualification score
    qualification = calculate_score(requirements)

    # Step 3: Update lead qualification
    lead.score = qualification.score
    lead.temperature = qualification.temperature
    lead.intent = requirements.intent

    # Step 4: Store extracted requirements
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

    # Step 5: Store qualification information
    lead.qualification_reasons = json.dumps(
        qualification.reasons
    )

    lead.next_best_action = qualification.next_best_action

    # Step 6: Save updated lead
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Step 7: Create activity
    activity = LeadActivity(
        lead_id=lead.id,
        activity_type="AI_QUALIFICATION",
        description=(
            f"Lead qualified as "
            f"{qualification.temperature} "
            f"with score {qualification.score}."
        ),
    )

    db.add(activity)
    db.commit()
    db.refresh(activity)

    # Step 8: Create follow-up
    follow_up = create_follow_up(
        db=db,
        lead=lead,
    )

    # Step 9: Create next best action
    next_best_action = create_next_best_action(
        db=db,
        lead=lead,
    )

    # Step 10: Return complete result
    return {
        "lead": lead,
        "requirements": requirements,
        "qualification": qualification,
        "activity": activity,
        "follow_up": follow_up,
        "next_best_action": next_best_action,
    }