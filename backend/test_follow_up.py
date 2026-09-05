from backend.app.db.database import SessionLocal
from backend.app.models.lead import Lead
from backend.app.services.follow_up_service import create_follow_up


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

        follow_up = create_follow_up(
            db=db,
            lead=lead
        )

        print("\n===== FOLLOW-UP CREATED =====")
        print("ID:", follow_up.id)
        print("Type:", follow_up.follow_up_type)
        print("Scheduled:", follow_up.scheduled_at)
        print("Status:", follow_up.status)
        print("Action:", follow_up.action)
        print("Reason:", follow_up.reason)

finally:
    db.close()