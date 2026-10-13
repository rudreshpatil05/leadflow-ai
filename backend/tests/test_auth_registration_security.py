import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.db.database import Base, get_db
from backend.app.main import app
from backend.app.models.user import User


@pytest.fixture
def auth_test_context():
    """Run registration tests against an isolated in-memory SQLite database."""
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

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        yield client, TestingSessionLocal
    finally:
        client.close()
        if previous_override is None:
            app.dependency_overrides.pop(get_db, None)
        else:
            app.dependency_overrides[get_db] = previous_override
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.mark.parametrize("requested_role", ["ADMIN", "MANAGER"])
def test_public_registration_cannot_assign_privileged_role(
    auth_test_context, requested_role
):
    client, TestingSessionLocal = auth_test_context

    response = client.post(
        "/api/v1/auth/register",
        json={
            "name": "Registration Security Test",
            "email": f"security-{requested_role.lower()}@example.com",
            "password": "TestPassword!123",
            "role": requested_role,
        },
    )

    assert response.status_code == 200, response.text
    assert response.json()["user"]["role"] == "SALES"

    with TestingSessionLocal() as db:
        user = (
            db.query(User)
            .filter(
                User.email
                == f"security-{requested_role.lower()}@example.com"
            )
            .one()
        )
        assert user.role == "SALES"
