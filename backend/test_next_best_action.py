from backend.app.db.database import SessionLocal
from backend.app.models.lead import Lead
from backend.app.services.next_best_action_service import (
    create_next_best_action,
)


db = SessionLocal()

try:
    lead = db.query(Lead).filter(Lead.id == 5).first()

    if not lead:
        print("Lead not found")

    else:
        print("===== LEAD =====")
        print("Name:", lead.name)
        print("Score:", lead.score)
        print("Temperature:", lead.temperature)

        action = create_next_best_action(
            db=db,
            lead=lead,
        )

        print("\n===== NEXT BEST ACTION =====")
        print("ID:", action.id)
        print("Priority:", action.priority)
        print("Action:", action.action)
        print("Channel:", action.channel)
        print("Status:", action.status)
        print("Reason:", action.reason)

finally:
    db.close()