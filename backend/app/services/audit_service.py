from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog


class AuditService:

    @staticmethod
    def log(
        db: Session,
        action: str,
        lead_id: int | None = None,
        description: str | None = None,
    ):
        try:
            entry = AuditLog(
                action=action,
                lead_id=lead_id,
                description=description,
            )

            db.add(entry)
            db.commit()
            db.refresh(entry)

            return entry

        except Exception:
            db.rollback()
            return None