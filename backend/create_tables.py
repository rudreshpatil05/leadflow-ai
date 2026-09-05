from backend.app.db.database import Base, engine

# Import all models so SQLAlchemy knows about them
from backend.app.models.lead import Lead
from backend.app.models.lead_activity import LeadActivity
from backend.app.models.follow_up import FollowUp
from backend.app.models.next_best_action import NextBestAction

Base.metadata.create_all(bind=engine)

print("Database tables created successfully.")