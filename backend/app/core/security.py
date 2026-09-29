import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt


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


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iterations, salt_hex, hash_hex = password_hash.split("$")

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


def create_access_token(
    user_id: int,
    email: str,
    role: str,
) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES
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


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM],
    )