
from backend.app.schemas.qualification import LeadRequirements
from backend.app.schemas.qualification_result import QualificationResult


def calculate_lead_score(
    requirements: LeadRequirements,
) -> QualificationResult:

    score = 0
    reasoning = []
    missing_fields = []

    # -------------------------
    # Budget
    # -------------------------

    if requirements.budget.max_amount is not None:
        score += 15
        reasoning.append("Budget provided")
    else:
        missing_fields.append("budget")

    # -------------------------
    # Location
    # -------------------------

    if requirements.location:
        score += 10
        reasoning.append("Preferred location provided")
    else:
        missing_fields.append("location")

    # -------------------------
    # Configuration
    # -------------------------

    if requirements.configuration:
        score += 10
        reasoning.append("Property configuration provided")
    else:
        missing_fields.append("configuration")

    # -------------------------
    # Timeline
    # -------------------------

    if requirements.timeline:

        timeline = requirements.timeline.lower()

        if (
            "3 month" in timeline
            or "within 3" in timeline
            or "immediately" in timeline
            or "urgent" in timeline
        ):
            score += 25
            reasoning.append("Immediate buying timeline")

        elif (
            "6 month" in timeline
            or "6 months" in timeline
        ):
            score += 15
            reasoning.append("Buying within 3–6 months")

        else:
            reasoning.append("Buying timeline provided")

    else:
        missing_fields.append("timeline")

    # -------------------------
    # Purpose
    # -------------------------

    if requirements.purpose:
        score += 5
        reasoning.append("Purchase purpose identified")
    else:
        missing_fields.append("purpose")

    # -------------------------
    # Down payment
    # -------------------------

    if requirements.down_payment is not None:
        score += 10
        reasoning.append("Down payment information provided")

    # -------------------------
    # Financing
    # -------------------------

    if requirements.financing_required is not None:
        score += 5
        reasoning.append("Financing requirement identified")

    # -------------------------
    # Intent
    # -------------------------

    if requirements.intent:

        intent = requirements.intent.lower()

        if intent == "high":
            score += 15
            reasoning.append("High buying intent")

        elif intent == "medium":
            score += 8
            reasoning.append("Medium buying intent")

    # -------------------------
    # Classification
    # -------------------------

    if score >= 80:
        temperature = "HOT"

    elif score >= 60:
        temperature = "WARM"

    elif score >= 30:
        temperature = "COLD"

    else:
        temperature = "NOT QUALIFIED"

    # -------------------------
    # Next question
    # -------------------------

    next_question = None

    if missing_fields:

        questions = {
            "budget": "What is your approximate budget for the property?",
            "location": "Which specific area or locality do you prefer?",
            "configuration": "Which configuration are you looking for, such as 1BHK, 2BHK, or 3BHK?",
            "timeline": "When are you planning to purchase the property?",
            "purpose": "Is the property for self-use or investment?",
        }

        next_question = questions.get(
            missing_fields[0]
        )

    # -------------------------
    # Next best action
    # -------------------------

    if temperature == "HOT":
        next_best_action = (
            "Assign to a sales representative immediately "
            "and prioritize site-visit scheduling."
        )

    elif temperature == "WARM":
        next_best_action = (
            "Continue qualification and schedule "
            "a follow-up within 24 hours."
        )

    elif temperature == "COLD":
        next_best_action = (
            "Add to automated nurture campaign "
            "and continue collecting requirements."
        )

    else:
        next_best_action = (
            "Collect additional information before "
            "sending the lead to sales."
        )

    return QualificationResult(
        score=min(score, 100),
        temperature=temperature,
        missing_fields=missing_fields,
        next_question=next_question,
        next_best_action=next_best_action,
        reasoning=reasoning,
    )