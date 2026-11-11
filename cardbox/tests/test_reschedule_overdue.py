"""Tests for the cardbox reschedule-overdue path (#498/#499).

Covers the ``views.rescheduleOverdue`` distribution logic and the
``/rescheduleOverdue`` endpoint's request validation. The tests use the
in-memory SQLite cardbox helpers shared with the sweep tests, with ``time``
frozen by the ``clock`` fixture and the random jitter pinned to zero so the
day buckets are deterministic.
"""
from contextlib import contextmanager

import pytest

import helpers

from flask import g

from cardbox import app, views  # noqa: E402


BASE = 1_700_000_000
DAY = 86400


def snapshot(con):
    """Return {question: (difficulty, cardbox, next_scheduled)}."""
    return {
        row[0]: row[1:]
        for row in con.execute(
            "select question, difficulty, cardbox, next_scheduled from questions")
    }


def run_reschedule(con, words_per_day, min_cb=0, max_cb=None):
    with helpers.request_for(con):
        return views.rescheduleOverdue(words_per_day, min_cb, max_cb)


@contextmanager
def view_request(con, payload):
    """Push a POST request context with g.cur/g.con populated by hand.

    The teardown that closes g.con is suppressed because an in-memory SQLite
    database cannot be reopened, matching helpers.request_for.
    """
    saved = app.teardown_request_funcs.get(None, [])
    app.teardown_request_funcs[None] = []
    try:
        with app.test_request_context(
                "/rescheduleOverdue", method="POST", json=payload):
            g.uuid = "test-user"
            g.con = con
            g.cur = con.cursor()
            yield
    finally:
        app.teardown_request_funcs[None] = saved


def call_view(con, payload):
    """Call the view directly and return (json_body, status_code)."""
    with view_request(con, payload):
        result = views.rescheduleOverdueView()
    if isinstance(result, tuple):
        response, status = result
    else:
        response, status = result, result.status_code
    return response.get_json(), status


@pytest.fixture(autouse=True)
def no_jitter(monkeypatch):
    """Pin the intra-day jitter so new times are deterministic."""
    monkeypatch.setattr(views.random, "uniform", lambda low, high: 0.0)


# --- Library function: rescheduleOverdue -------------------------------------

def test_no_overdue_words_is_a_noop(clock):
    clock.now = BASE
    rows = [
        ("future", -1, 0, BASE + DAY),
        ("also_future", 0, 3, BASE + 7 * DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)
    before = snapshot(con)

    assert run_reschedule(con, 10) == 0
    assert snapshot(con) == before


def test_only_overdue_rows_in_range_are_rescheduled(clock):
    clock.now = BASE
    rows = [
        ("at_min", 0, 5, BASE - 100),
        ("inside", -1, 6, BASE - 200),
        ("at_max", 4, 8, BASE - 300),
        ("below_min", -1, 4, BASE - 400),
        ("above_max", -1, 9, BASE - 500),
        ("future", -1, 6, BASE + DAY),
        ("no_cardbox", -1, None, BASE - 600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)
    before = snapshot(con)

    assert run_reschedule(con, 10, min_cb=5, max_cb=8) == 3

    after = snapshot(con)
    for question in ("at_min", "inside", "at_max"):
        difficulty, cardbox, next_scheduled = after[question]
        assert difficulty == 5
        assert cardbox == before[question][1]
        assert next_scheduled >= BASE

    for question in ("below_min", "above_max", "future", "no_cardbox"):
        assert after[question] == before[question]


def test_max_cardbox_none_includes_everything_above_min(clock):
    clock.now = BASE
    rows = [
        ("below", -1, 0, BASE - 100),
        ("at_min", -1, 5, BASE - 200),
        ("middle", -1, 10, BASE - 300),
        ("high", -1, 30, BASE - 400),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    assert run_reschedule(con, 10, min_cb=5, max_cb=None) == 3

    after = snapshot(con)
    assert after["below"][0] == -1
    assert after["at_min"][0] == 5
    assert after["middle"][0] == 5
    assert after["high"][0] == 5


def test_distribution_is_even_and_keeps_oldest_first(clock):
    clock.now = BASE
    # q00 is the oldest overdue word, q24 the most recent.
    rows = [
        ("q%02d" % i, -1, i % 5, BASE - (25 - i) * 60)
        for i in range(25)
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    assert run_reschedule(con, 10) == 25

    result = sorted(
        ((row[2], row[0]) for row in con.execute(
            "select question, difficulty, next_scheduled from questions"
        )),
        key=lambda item: item[0],
    )
    order = [question for _, question in result]
    assert order == ["q%02d" % i for i in range(25)]

    day_counts = {}
    for next_scheduled, _ in result:
        day_index = (next_scheduled - BASE) // DAY
        day_counts[day_index] = day_counts.get(day_index, 0) + 1

    assert day_counts == {0: 10, 1: 10, 2: 5}


def test_rate_larger_than_backlog_fits_in_first_day(clock):
    clock.now = BASE
    rows = [
        ("q%d" % i, -1, 0, BASE - (i + 1) * 60)
        for i in range(4)
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    assert run_reschedule(con, 100) == 4

    for (next_scheduled,) in con.execute(
            "select next_scheduled from questions"):
        assert BASE <= next_scheduled < BASE + DAY


# --- Endpoint: request validation --------------------------------------------

@pytest.mark.parametrize("payload", [
    {},
    {"wordsPerDay": None},
    {"wordsPerDay": 0},
    {"wordsPerDay": -5},
    {"wordsPerDay": "abc"},
    {"wordsPerDay": 10, "minCardbox": "abc"},
    {"wordsPerDay": 10, "maxCardbox": "abc"},
    {"wordsPerDay": 10, "minCardbox": 5, "maxCardbox": 2},
])
def test_invalid_payloads_return_400(clock, payload):
    clock.now = BASE
    con = helpers.make_db([], cleared_until=BASE)

    body, status = call_view(con, payload)

    assert status == 400
    assert "error" in body


def test_valid_payload_reschedules_and_returns_count(clock):
    clock.now = BASE
    rows = [
        ("one", -1, 1, BASE - 100),
        ("two", -1, 2, BASE - 200),
        ("out_of_range", -1, 3, BASE - 300),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    body, status = call_view(con, {
        "wordsPerDay": 5,
        "minCardbox": 1,
        "maxCardbox": 2,
    })

    assert status == 200
    assert body == {"rescheduled": 2}
    after = snapshot(con)
    assert after["one"][0] == 5
    assert after["two"][0] == 5
    assert after["out_of_range"] == (-1, 3, BASE - 300)


def test_numeric_strings_are_coerced(clock):
    clock.now = BASE
    rows = [("one", -1, 0, BASE - 100)]
    con = helpers.make_db(rows, cleared_until=BASE)

    body, status = call_view(con, {
        "wordsPerDay": "2",
        "minCardbox": "0",
    })

    assert status == 200
    assert body == {"rescheduled": 1}
