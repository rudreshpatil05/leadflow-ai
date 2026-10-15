
import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock

from backend.app.core.lead_access import get_accessible_lead


def make_user(user_id: int, role: str):
    user = MagicMock()
    user.id = user_id
    user.role = role
    return user


def make_db_query(lead):
    query = MagicMock()
    query.filter.return_value = query
    query.first.return_value = lead

    db = MagicMock()
    db.query.return_value = query
    return db, query


def test_sales_can_access_assigned_lead():
    lead = MagicMock()
    db, query = make_db_query(lead)

    result = get_accessible_lead(
        lead_id=10,
        db=db,
        current_user=make_user(5, "SALES"),
    )

    assert result is lead
    assert query.filter.call_count == 2


def test_sales_cannot_access_unassigned_lead():
    db, query = make_db_query(None)

    with pytest.raises(HTTPException) as exc:
        get_accessible_lead(
            lead_id=10,
            db=db,
            current_user=make_user(5, "SALES"),
        )

    assert exc.value.status_code == 404
    assert query.filter.call_count == 2


@pytest.mark.parametrize("role", ["ADMIN", "MANAGER"])
def test_admin_and_manager_can_access_existing_lead(role):
    lead = MagicMock()
    db, query = make_db_query(lead)

    result = get_accessible_lead(
        lead_id=10,
        db=db,
        current_user=make_user(5, role),
    )

    assert result is lead
    assert query.filter.call_count == 1


def test_unknown_role_is_forbidden():
    db, query = make_db_query(None)

    with pytest.raises(HTTPException) as exc:
        get_accessible_lead(
            lead_id=10,
            db=db,
            current_user=make_user(5, "UNKNOWN"),
        )

    assert exc.value.status_code == 403
    query.first.assert_not_called()
