from dataclasses import dataclass


@dataclass
class AutomationRule:
    name: str
    trigger: str
    description: str
    enabled: bool = True


AUTOMATION_RULES = [
    AutomationRule(
        name="Hot Lead Follow-up",
        trigger="HOT_LEAD",
        description="Create an immediate follow-up for hot leads.",
    ),
    AutomationRule(
        name="Qualified Lead Follow-up",
        trigger="QUALIFIED_LEAD",
        description="Create follow-up when a lead becomes qualified.",
    ),
    AutomationRule(
        name="Site Visit Follow-up",
        trigger="SITE_VISIT",
        description="Create follow-up after site visit stage.",
    ),
    AutomationRule(
        name="Inactive Lead Re-engagement",
        trigger="INACTIVE_LEAD",
        description="Re-engage leads that have been inactive.",
    ),
]