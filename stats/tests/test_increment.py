"""Regression tests for #725: /increment must not deadlock on the cold path.

The old code ran UPDATE-then-INSERT. Under REPEATABLE READ the zero-row UPDATE
takes a gap lock on ``ldbd_idx``, so the INSERT's insert-intention lock
conflicted with the other first-of-day requests' gap locks and the burst
deadlocked with errno 1213. The fix is one ``INSERT ... ON DUPLICATE KEY
UPDATE`` statement (exclusive lock on the conflicting row) plus a retry.
"""
from flask import g

from stats import app, views

from helpers import RequestsShim


def run_increment(monkeypatch, cursor):
    """Call the helper directly, outside a request, with a fake cursor."""
    with app.app_context():
        g.uuid = "test-user-uuid"
        g.headers = {"Authorization": "Bearer test-token"}
        g.con = cursor
        views._increment_leaderboard()


def writes(cursor):
    return [(sql, args) for sql, args in cursor.statements
            if sql.lower().startswith(("insert", "update", "delete", "replace"))]


def test_cold_path_is_a_single_upsert(client, cursor, cardbox):
    resp = client.get("/increment")

    assert resp.status_code == 200
    assert resp.get_json() == {"questionsAnswered": 1, "startScore": 77}

    statements = writes(cursor)
    assert len(statements) == 1, f"expected one write, got {statements}"
    sql, args = statements[0]
    assert sql.lower().startswith("insert into leaderboard")
    assert "on duplicate key update questionsAnswered = questionsAnswered + 1" in sql
    assert "startscore" not in sql.lower().split("on duplicate key update")[1]
    assert args == ("test-user-uuid", 77)
    assert "test-user-uuid" not in sql
    assert len(cardbox) == 1


def test_no_update_then_insert_pattern(client, cursor, cardbox):
    """The old deadlocking pair must not come back."""
    client.get("/increment")

    assert not cursor.statements_starting("update leaderboard")
    # one pre-check read, one write, one read for the response
    assert [sql.split()[0].lower() for sql, _ in cursor.statements] == \
        ["select", "insert", "select"]


def test_hot_path_does_not_call_cardbox(client, cursor, cardbox):
    cursor.exists = True
    cursor.questions = 5

    resp = client.get("/increment")

    assert resp.status_code == 200
    assert resp.get_json() == {"questionsAnswered": 6, "startScore": 77}
    assert len(writes(cursor)) == 1
    assert cardbox == []


def test_cardbox_round_trip_happens_before_the_write(client, cursor, monkeypatch):
    """No lock may be held across the cardbox call."""
    calls = []
    monkeypatch.setattr(views, "requests",
                        RequestsShim(calls, probe=lambda: len(writes(cursor))))

    client.get("/increment")

    assert calls[0]["statements_so_far"] == 0


def test_deadlock_is_retried(cursor, deadlock, cardbox, monkeypatch):
    cursor.insert_errors = [deadlock, deadlock]

    run_increment(monkeypatch, cursor)

    assert cursor.insert_attempts == 3
    assert cursor.exists is True
    assert cursor.questions == 1


def test_lock_wait_timeout_is_retried(cursor, cardbox, monkeypatch):
    cursor.insert_errors = [views.mysql.OperationalError(1205, "Lock wait timeout")]

    run_increment(monkeypatch, cursor)

    assert cursor.insert_attempts == 2
    assert cursor.exists is True


def test_persistent_deadlock_raises_after_three_attempts(cursor, deadlock, cardbox,
                                                          monkeypatch):
    cursor.insert_errors = [deadlock, deadlock, deadlock]

    try:
        run_increment(monkeypatch, cursor)
    except views.mysql.OperationalError as e:
        assert e.args[0] == 1213
    else:
        raise AssertionError("expected the deadlock to propagate")

    assert cursor.insert_attempts == 3


def test_other_operational_errors_are_not_retried(cursor, cardbox, monkeypatch):
    cursor.insert_errors = [views.mysql.OperationalError(2006, "server has gone away")]

    try:
        run_increment(monkeypatch, cursor)
    except views.mysql.OperationalError as e:
        assert e.args[0] == 2006
    else:
        raise AssertionError("expected the error to propagate")

    assert cursor.insert_attempts == 1
