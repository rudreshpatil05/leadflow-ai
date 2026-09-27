from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog


def create_audit_log(
    db: Session,
    action: str,
    description: str,
    lead_id: int | None = None,
):
    audit = AuditLog(
        lead_id=lead_id,
        action=action,
        description=description,
    )

    db.add(audit)
    db.commit()
    db.refresh(audit)

    return audit