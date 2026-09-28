from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from backend.app.models.automation_log import AutomationLog
from backend.app.models.automation_rule import AutomationRule
from backend.app.models.follow_up import FollowUp
from backend.app.models.lead import Lead
from backend.app.models.notification import Notification


class AutomationService:

    def __init__(self, db: Session):
        self.db = db

    def log(
        self,
        lead_id: int | None,
        rule_id: int | None,
        event_type: str,
        action_type: str,
        status: str = "SUCCESS",
        message: str | None = None,
    ):
        log_entry = AutomationLog(
            lead_id=lead_id,
            rule_id=rule_id,
            event_type=event_type,
            action_type=action_type,
            status=status,
            message=message,
        )

        self.db.add(log_entry)
        self.db.commit()
        self.db.refresh(log_entry)

        return log_entry

    def create_notification(
        self,
        lead: Lead,
        title: str,
        message: str,
        notification_type: str = "AUTOMATION",
    ):
        notification = Notification(
            lead_id=lead.id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
        )

        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        return notification

    def create_follow_up(
        self,
        lead: Lead,
        channel: str = "WHATSAPP",
        delay_hours: int = 24,
        notes: str | None = None,
    ):
        scheduled_at = datetime.utcnow() + timedelta(hours=delay_hours)

        follow_up = FollowUp(
            lead_id=lead.id,
            scheduled_at=scheduled_at,
            channel=channel,
            status="PENDING",
            notes=notes,
        )

        self.db.add(follow_up)
        self.db.commit()
        self.db.refresh(follow_up)

        return follow_up

    def execute_rule(
        self,
        rule: AutomationRule,
        lead: Lead,
        event_type: str,
    ):
        action_type = str(rule.action_type or "").upper()

        if action_type == "PRIORITY_ALERT":
            self.create_notification(
                lead=lead,
                title="🔥 Hot Lead Priority Alert",
                message=(
                    f"Lead {lead.name or lead.phone} is a HOT lead. "
                    "Immediate follow-up is recommended."
                ),
                notification_type="PRIORITY",
            )

            return "Priority alert notification created"

        if action_type == "CREATE_FOLLOW_UP":
            channel = "WHATSAPP"

            action_value = str(rule.action_value or "").upper()

            if "PHONE" in action_value:
                channel = "PHONE"
            elif "CALL" in action_value:
                channel = "PHONE"
            elif "EMAIL" in action_value:
                channel = "EMAIL"

            self.create_follow_up(
                lead=lead,
                channel=channel,
                delay_hours=24,
                notes=(
                    f"Automatically created by rule: {rule.name}"
                ),
            )

            return f"Automatic {channel} follow-up created"

        if action_type == "CREATE_NOTIFICATION":
            self.create_notification(
                lead=lead,
                title=rule.name,
                message=(
                    rule.description
                    or f"Automation rule triggered for {lead.name or lead.phone}"
                ),
                notification_type="AUTOMATION",
            )

            return "Automation notification created"

        return f"Unsupported automation action: {action_type}"

    def evaluate_rule(
        self,
        rule: AutomationRule,
        lead: Lead,
        event_type: str,
    ) -> bool:

        if not rule.is_active:
            return False

        if str(rule.event_type or "").upper() != str(event_type).upper():
            return False

        condition_type = str(rule.condition_type or "").upper()
        condition_value = str(rule.condition_value or "").strip().upper()

        if condition_type == "TEMPERATURE":
            lead_temperature = str(lead.temperature or "").strip().upper()
            return lead_temperature == condition_value

        if condition_type == "STATUS":
            lead_status = str(lead.status or "").strip().upper()
            return lead_status == condition_value

        if condition_type == "NONE":
            return True

        return False

    def process_event(
        self,
        lead: Lead,
        event_type: str = "LEAD_CREATED",
    ):
        rules = (
            self.db.query(AutomationRule)
            .filter(
                AutomationRule.is_active.is_(True),
                AutomationRule.event_type == event_type,
            )
            .order_by(AutomationRule.id.asc())
            .all()
        )

        executed = []
        skipped = []

        for rule in rules:

            if not self.evaluate_rule(
                rule=rule,
                lead=lead,
                event_type=event_type,
            ):
                skipped.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                    }
                )
                continue

            try:
                message = self.execute_rule(
                    rule=rule,
                    lead=lead,
                    event_type=event_type,
                )

                self.log(
                    lead_id=lead.id,
                    rule_id=rule.id,
                    event_type=event_type,
                    action_type=rule.action_type,
                    status="SUCCESS",
                    message=message,
                )

                executed.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                        "action_type": rule.action_type,
                        "message": message,
                    }
                )

            except Exception as exc:
                self.db.rollback()

                self.log(
                    lead_id=lead.id,
                    rule_id=rule.id,
                    event_type=event_type,
                    action_type=rule.action_type,
                    status="FAILED",
                    message=str(exc),
                )

                executed.append(
                    {
                        "rule_id": rule.id,
                        "rule_name": rule.name,
                        "action_type": rule.action_type,
                        "status": "FAILED",
                        "message": str(exc),
                    }
                )

        return {
            "success": True,
            "lead_id": lead.id,
            "event_type": event_type,
            "rules_checked": len(rules),
            "rules_executed": len(executed),
            "executed": executed,
            "skipped": skipped,
        }