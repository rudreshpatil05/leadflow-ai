from pydantic import ValidationError

from backend.app.core import auth, security
from backend.app.core.config import Settings


def test_jwt_modules_share_central_configuration():
    from backend.app.core.config import settings

    assert settings.JWT_SECRET_KEY
    assert auth.JWT_SECRET_KEY == settings.JWT_SECRET_KEY
    assert security.JWT_SECRET_KEY == settings.JWT_SECRET_KEY
    assert auth.JWT_ALGORITHM == security.JWT_ALGORITHM
    assert (
        auth.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        == security.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )


def test_token_created_by_security_can_be_decoded_by_auth():
    token = security.create_access_token(
        user_id=123,
        email="jwt-test@example.com",
        role="SALES",
    )

    payload = auth.decode_access_token(token)

    assert payload is not None
    assert str(payload["sub"]) == "123"
    assert payload["email"] == "jwt-test@example.com"


def test_production_rejects_known_development_secret():
    try:
        Settings(
            DATABASE_URL="sqlite://",
            GEMINI_API_KEY="test",
            APP_ENV="production",
            JWT_SECRET_KEY="development-only-secret-change-this",
        )
    except ValidationError:
        return

    raise AssertionError(
        "Production settings accepted the known development secret."
    )


def test_production_rejects_empty_secret():
    try:
        Settings(
            DATABASE_URL="sqlite://",
            GEMINI_API_KEY="test",
            APP_ENV="production",
            JWT_SECRET_KEY="",
        )
    except ValidationError:
        return

    raise AssertionError("Production settings accepted an empty JWT secret.")
