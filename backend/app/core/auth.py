import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.user import User


# =========================================================
# JWT CONFIGURATION
# =========================================================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "development-only-secret-change-this",
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256",
)

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "1440",
    )
)


# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)

    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        310000,
    )

    return (
        "pbkdf2_sha256$310000$"
        f"{salt.hex()}$"
        f"{derived_key.hex()}"
    )


def verify_password(
    password: str,
    password_hash: str,
) -> bool:
    try:
        algorithm, iterations, salt_hex, hash_hex = (
            password_hash.split("$")
        )

        if algorithm != "pbkdf2_sha256":
            return False

        salt = bytes.fromhex(salt_hex)

        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )

        return hmac.compare_digest(
            derived_key.hex(),
            hash_hex,
        )

    except Exception:
        return False


# =========================================================
# JWT TOKEN CREATION
# =========================================================

def create_access_token(
    user_id: int,
    email: str,
    role: str,
) -> str:
    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM,
    )


# =========================================================
# JWT TOKEN DECODING
# =========================================================

def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )


# =========================================================
# FASTAPI AUTHENTICATION
# =========================================================

security_scheme = HTTPBearer(
    auto_error=True,
)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        security_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    """
    Validate the JWT access token and return
    the currently authenticated user.
    """

    token = credentials.credentials

    try:
        payload = decode_access_token(token)

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    try:
        user_id = int(user_id)

    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


# =========================================================
# ROLE-BASED ACCESS CONTROL
# =========================================================

def require_roles(*allowed_roles: str):
    """
    Create a FastAPI dependency that allows only
    users with one of the specified roles.
    """

    normalized_roles = {
        str(role).strip().upper()
        for role in allowed_roles
    }

    def role_dependency(
        current_user: User = Depends(
            get_current_user
        ),
    ) -> User:

        current_role = str(
            current_user.role or ""
        ).strip().upper()

        if current_role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You do not have permission "
                    "to perform this action."
                ),
            )

        return current_user

    return role_dependency


# =========================================================
# COMMON ROLE DEPENDENCIES
# =========================================================

require_admin = require_roles(
    "ADMIN"
)

require_manager = require_roles(
    "ADMIN",
    "MANAGER",
)

require_sales = require_roles(
    "ADMIN",
    "MANAGER",
    "SALES",
)