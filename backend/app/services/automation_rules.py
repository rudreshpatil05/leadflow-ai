from sqlalchemy.orm import Session

from backend.app.models.automation_rule import AutomationRule


DEFAULT_RULES = [
    {
        "name": "Hot Lead Priority Alert",
        "description": "Notify sales when a hot lead is created.",
        "event_type": "LEAD_CREATED",
        "condition_type": "TEMPERATURE",
        "condition_value": "HOT",
        "action_type": "PRIORITY_ALERT",
        "action_value": None,
    },
    {
        "name": "Hot Lead Automatic Follow-up",
        "description": "Create a phone follow-up for hot leads.",
        "event_type": "LEAD_CREATED",
        "condition_type": "TEMPERATURE",
        "condition_value": "HOT",
        "action_type": "CREATE_FOLLOW_UP",
        "action_value": "PHONE",
    },
    {
        "name": "Warm Lead WhatsApp Follow-up",
        "description": "Create a WhatsApp follow-up for warm leads.",
        "event_type": "LEAD_CREATED",
        "condition_type": "TEMPERATURE",
        "condition_value": "WARM",
        "action_type": "CREATE_FOLLOW_UP",
        "action_value": "WHATSAPP",
    },
    {
        "name": "Qualified Lead Notification",
        "description": "Notify sales when a lead becomes qualified.",
        "event_type": "STATUS_CHANGED",
        "condition_type": "STATUS",
        "condition_value": "QUALIFIED",
        "action_type": "CREATE_NOTIFICATION",
        "action_value": "Lead has been qualified and requires sales action.",
    },
    {
        "name": "Interested Lead Follow-up",
        "description": "Create follow-up when lead becomes interested.",
        "event_type": "STATUS_CHANGED",
        "condition_type": "STATUS",
        "condition_value": "INTERESTED",
        "action_type": "CREATE_FOLLOW_UP",
        "action_value": "WHATSAPP",
    },
]


def initialize_default_rules(db: Session):

    created = []

    for rule_data in DEFAULT_RULES:

        existing = (
            db.query(AutomationRule)
            .filter(
                AutomationRule.name == rule_data["name"]
            )
            .first()
        )

        if existing:
            continue

        rule = AutomationRule(
            **rule_data,
        )

        db.add(rule)
        created.append(rule)

    db.commit()

    return created