from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current UTC time as a naive datetime.

    Existing SQLAlchemy columns use timezone-naive DateTime values.
    Keep that convention while avoiding deprecated datetime.utcnow().
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
