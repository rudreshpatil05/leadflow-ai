from sqlalchemy.orm import Session

from backend.app.models.lead import Lead
from backend.app.services.automation_service import AutomationService


class LeadEventService:
    """
    Central event dispatcher for LeadFlow AI.

    This service keeps lead business logic separate from
    automation execution.
    """

    def __init__(self, db: Session):
        self.db = db
        self.automation_service = AutomationService(db)

    def lead_created(self, lead: Lead):
        """
        Trigger automation rules when a new lead is created.
        """

        if not lead:
            return {
                "success": False,
                "triggered": False,
                "message": "Lead not found",
            }

        try:
            result = self.automation_service.process_event(
                lead=lead,
                event_type="LEAD_CREATED",
            )

            return {
                "success": True,
                "triggered": True,
                "event_type": "LEAD_CREATED",
                "result": result,
            }

        except Exception as exc:
            # Automation failure must not break lead creation.
            self.db.rollback()

            return {
                "success": False,
                "triggered": True,
                "event_type": "LEAD_CREATED",
                "message": str(exc),
            }

    def status_changed(
        self,
        lead: Lead,
        old_status: str | None,
        new_status: str | None,
    ):
        """
        Trigger automation when a lead changes pipeline status.
        """

        if not lead:
            return {
                "success": False,
                "triggered": False,
                "message": "Lead not found",
            }

        old_value = str(old_status or "").strip().upper()
        new_value = str(new_status or "").strip().upper()

        # No real change.
        if old_value == new_value:
            return {
                "success": True,
                "triggered": False,
                "event_type": "STATUS_CHANGED",
                "message": "Status did not change",
            }

        # Terminal states should not continue normal automation.
        if new_value in {"CONVERTED", "LOST"}:
            return {
                "success": True,
                "triggered": False,
                "event_type": "STATUS_CHANGED",
                "message": (
                    f"Automation stopped for terminal status "
                    f"{new_value}"
                ),
            }

        try:
            result = self.automation_service.process_event(
                lead=lead,
                event_type="STATUS_CHANGED",
            )

            return {
                "success": True,
                "triggered": True,
                "event_type": "STATUS_CHANGED",
                "old_status": old_value,
                "new_status": new_value,
                "result": result,
            }

        except Exception as exc:
            self.db.rollback()

            return {
                "success": False,
                "triggered": True,
                "event_type": "STATUS_CHANGED",
                "old_status": old_value,
                "new_status": new_value,
                "message": str(exc),
            }

    def temperature_changed(
        self,
        lead: Lead,
        old_temperature: str | None,
        new_temperature: str | None,
    ):
        """
        Trigger automation when lead temperature changes.

        This is intentionally exposed here so qualification logic
        can use the same event system.
        """

        if not lead:
            return {
                "success": False,
                "triggered": False,
                "message": "Lead not found",
            }

        old_value = str(old_temperature or "").strip().upper()
        new_value = str(new_temperature or "").strip().upper()

        if old_value == new_value:
            return {
                "success": True,
                "triggered": False,
                "event_type": "TEMPERATURE_CHANGED",
                "message": "Temperature did not change",
            }

        try:
            result = self.automation_service.process_event(
                lead=lead,
                event_type="TEMPERATURE_CHANGED",
            )

            return {
                "success": True,
                "triggered": True,
                "event_type": "TEMPERATURE_CHANGED",
                "old_temperature": old_value,
                "new_temperature": new_value,
                "result": result,
            }

        except Exception as exc:
            self.db.rollback()

            return {
                "success": False,
                "triggered": True,
                "event_type": "TEMPERATURE_CHANGED",
                "old_temperature": old_value,
                "new_temperature": new_value,
                "message": str(exc),
            }