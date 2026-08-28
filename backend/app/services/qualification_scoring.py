from dataclasses import dataclass


@dataclass
class QualificationResult:
    score: int
    temperature: str
    reasons: list[str]
    next_best_action: str


def calculate_score(requirements) -> QualificationResult:

    score = 0
    reasons = []

    # Timeline
    timeline = (requirements.timeline or "").lower()

    if "30" in timeline or "month" in timeline and "1" in timeline:
        score += 30
        reasons.append("Customer has a short buying timeline.")

    elif "3" in timeline:
        score += 25
        reasons.append("Customer intends to purchase within 3 months.")

    elif timeline:
        score += 10
        reasons.append("Customer has provided a buying timeline.")

    # Budget
    if requirements.budget and requirements.budget.max_amount:
        score += 15
        reasons.append("Customer has provided a clear budget.")

    # Configuration
    if requirements.configuration:
        score += 10
        reasons.append(
            f"Specific property configuration: {requirements.configuration}."
        )

    # Location
    if requirements.location:
        score += 10
        reasons.append(
            f"Specific target location: {requirements.location}."
        )

    # Financing
    if requirements.down_payment:
        score += 10
        reasons.append("Customer has indicated available down payment.")

    elif requirements.financing_required is not None:
        score += 5
        reasons.append("Financing requirement is known.")

    # Purpose
    if requirements.purpose:
        score += 5
        reasons.append(
            f"Purchase purpose identified as {requirements.purpose}."
        )

    # Intent
    intent = (requirements.intent or "").lower()

    if intent == "high":
        score += 15
        reasons.append("AI identified high purchase intent.")

    elif intent == "medium":
        score += 8
        reasons.append("AI identified medium purchase intent.")

    # Clamp
    score = max(0, min(score, 100))

    # Temperature
    if score >= 80:
        temperature = "HOT"
        next_action = (
            "Contact the lead immediately and prioritize a site visit."
        )

    elif score >= 60:
        temperature = "WARM"
        next_action = (
            "Follow up within the same day and complete missing qualification."
        )

    elif score >= 30:
        temperature = "COLD"
        next_action = (
            "Add to nurture workflow and follow up periodically."
        )

    else:
        temperature = "NOT QUALIFIED"
        next_action = (
            "Do not prioritize for immediate sales outreach."
        )

    return QualificationResult(
        score=score,
        temperature=temperature,
        reasons=reasons,
        next_best_action=next_action,
    )