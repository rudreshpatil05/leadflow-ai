
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db.database import Base, get_db
from backend.app.models.lead import Lead

# Import the models needed by the application's registered routes and
# their foreign-key relationships.
from backend.app.models.follow_up import FollowUp
from backend.app.models.user import User
from backend.app.models.lead_activity import LeadActivity
from backend.app.models.audit_log import AuditLog


@pytest.fixture
def test_context():
    """Use a fresh, isolated SQLite database for every test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as client:
            db = TestingSessionLocal()
            try:
                lead = Lead(
                    name="Pytest Test Lead",
                    phone="9000000001",
                    email="pytest-lead@example.com",
                    source="TEST",
                    status="NEW",
                    temperature="HOT",
                    score=80,
                )
                db.add(lead)
                db.commit()
                db.refresh(lead)
                lead_id = lead.id
            finally:
                db.close()

            yield client, lead_id, TestingSessionLocal
    finally:
        app.dependency_overrides.pop(get_db, None)
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def create_follow_up(client, lead_id, scheduled_at="2030-01-01T10:00:00"):
    response = client.post(
        f"/api/v1/follow-ups/lead/{lead_id}",
        json={
            "follow_up_type": "MANUAL",
            "scheduled_at": scheduled_at,
            "action": "Call customer",
            "reason": "Pytest verification",
            "notes": "Initial test note",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_create_and_list_follow_up(test_context):
    client, lead_id, _ = test_context

    created = create_follow_up(client, lead_id)

    assert created["lead_id"] == lead_id
    assert created["status"] == "PENDING"
    assert created["action"] == "Call customer"
    assert created["notes"] == "Initial test note"

    response = client.get(f"/api/v1/follow-ups/lead/{lead_id}")

    assert response.status_code == 200
    items = response.json()
    assert any(item["id"] == created["id"] for item in items)


def test_create_follow_up_for_missing_lead_returns_404(test_context):
    client, _, _ = test_context

    response = client.post(
        "/api/v1/follow-ups/lead/999999",
        json={
            "follow_up_type": "MANUAL",
            "scheduled_at": "2030-01-01T10:00:00",
            "action": "Call customer",
        },
    )

    assert response.status_code == 404


def test_complete_follow_up_sets_timestamp_and_creates_next(test_context):
    client, lead_id, SessionLocal = test_context
    created = create_follow_up(client, lead_id)

    response = client.patch(
        f"/api/v1/follow-ups/{created['id']}/complete"
    )

    assert response.status_code == 200, response.text
    result = response.json()

    assert result["completed_follow_up"]["status"] == "COMPLETED"
    assert result["completed_follow_up"]["completed_at"] is not None
    assert result["next_follow_up"] is not None
    assert result["next_follow_up"]["status"] == "PENDING"

    with SessionLocal() as db:
        completed = db.get(FollowUp, created["id"])
        assert completed is not None
        assert completed.status == "COMPLETED"
        assert completed.completed_at is not None


def test_completing_twice_does_not_create_another_next_follow_up(
    test_context,
):
    client, lead_id, SessionLocal = test_context
    created = create_follow_up(client, lead_id)

    first = client.patch(
        f"/api/v1/follow-ups/{created['id']}/complete"
    )
    assert first.status_code == 200, first.text

    second = client.patch(
        f"/api/v1/follow-ups/{created['id']}/complete"
    )
    assert second.status_code == 200, second.text
    assert second.json()["next_follow_up"] is None
    assert "already completed" in second.json()["message"].lower()

    with SessionLocal() as db:
        pending_count = (
            db.query(FollowUp)
            .filter(
                FollowUp.lead_id == lead_id,
                FollowUp.status == "PENDING",
            )
            .count()
        )
        assert pending_count == 1


def test_reschedule_updates_date_and_notes(test_context):
    client, lead_id, _ = test_context
    created = create_follow_up(client, lead_id)

    new_date = "2030-02-15T15:30:00"
    response = client.patch(
        f"/api/v1/follow-ups/{created['id']}/reschedule",
        json={
            "scheduled_at": new_date,
            "notes": "Customer requested afternoon callback",
        },
    )

    assert response.status_code == 200, response.text
    result = response.json()

    assert result["status"] == "PENDING"
    assert result["scheduled_at"].startswith(new_date)
    assert result["notes"] == "Customer requested afternoon callback"


def test_cancel_sets_status_and_timestamp(test_context):
    client, lead_id, _ = test_context
    created = create_follow_up(client, lead_id)

    response = client.post(
        f"/api/v1/follow-ups/{created['id']}/cancel"
    )

    assert response.status_code == 200, response.text
    result = response.json()

    assert result["status"] == "CANCELLED"
    assert result["cancelled_at"] is not None


def test_repeated_cancellation_is_idempotent(test_context):
    client, lead_id, _ = test_context
    created = create_follow_up(client, lead_id)

    url = f"/api/v1/follow-ups/{created['id']}/cancel"

    first = client.post(url)
    second = client.post(url)

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "CANCELLED"


def test_cancelled_follow_up_cannot_be_completed(test_context):
    client, lead_id, _ = test_context
    created = create_follow_up(client, lead_id)

    cancelled = client.post(
        f"/api/v1/follow-ups/{created['id']}/cancel"
    )
    assert cancelled.status_code == 200

    response = client.patch(
        f"/api/v1/follow-ups/{created['id']}/complete"
    )

    assert response.status_code == 400


def test_completed_follow_up_cannot_be_cancelled(test_context):
    client, lead_id, _ = test_context
    created = create_follow_up(client, lead_id)

    completed = client.patch(
        f"/api/v1/follow-ups/{created['id']}/complete"
    )
    assert completed.status_code == 200

    response = client.post(
        f"/api/v1/follow-ups/{created['id']}/cancel"
    )

    assert response.status_code == 400


@pytest.mark.parametrize(
    "method,path_suffix,payload",
    [
        ("patch", "complete", None),
        (
            "patch",
            "reschedule",
            {"scheduled_at": "2030-02-15T15:30:00"},
        ),
        ("post", "cancel", None),
    ],
)
def test_missing_follow_up_returns_404(
    test_context, method, path_suffix, payload
):
    client, _, _ = test_context
    url = f"/api/v1/follow-ups/999999/{path_suffix}"

    response = getattr(client, method)(
        url,
        json=payload if payload is not None else None,
    )

    assert response.status_code == 404
