"""Ordering tests for getQuestions / getNextBingo.

A missing ``cardbox`` in the request means "default ordering", while an
explicit ``cardbox: 0`` means "serve cardbox 0 first". They used to be
indistinguishable, which let future difficulty-5 (rescheduled) words in
cardbox 0 jump ahead of past-due words in higher cardboxes.

Closeting/eligibility is intentionally unchanged: the tests also pin the
difficulty sets for explicit vs default requests and for closets >= 0.
"""
from contextlib import contextmanager

import pytest

import helpers

from flask import g

from cardbox import app, views  # noqa: E402


BASE = 1_700_000_000
DAY = 86400


@pytest.fixture(autouse=True)
def stub_lexicon(monkeypatch):
    """getQuestionsFromCardbox looks words up via the lexicon service."""
    monkeypatch.setattr(views, "getAnagrams", lambda alpha: [alpha.lower()])


@pytest.fixture
def release_calls(monkeypatch):
    """Record makeWordsAvailable() calls instead of touching new words."""
    calls = []
    monkeypatch.setattr(views, "makeWordsAvailable", lambda needed: calls.append(needed))
    return calls


def questions(con, cardbox, num_needed, cardbox_requested, **request_kwargs):
    with helpers.request_for(con, **request_kwargs):
        return views.getQuestionsFromCardbox(
            num_needed, cardbox, None, cardbox_requested)


# --- getQuestionsFromCardbox: default ordering --------------------------------

def test_default_serves_past_due_before_future_rescheduled(clock, release_calls):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["DUE1", "RESCHED0"]
    assert release_calls == []


def test_default_orders_due_words_by_time_not_cardbox(clock):
    clock.now = BASE
    rows = [
        ("DUE_CB0", -1, 0, BASE - 60),
        ("DUE_CB2", -1, 2, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["DUE_CB2", "DUE_CB0"]


def test_default_treats_overdue_diff5_as_due(clock):
    clock.now = BASE
    rows = [
        ("PAST5", 5, 0, BASE - 7200),
        ("FUTURE5", 5, 0, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["PAST5", "FUTURE5"]


# --- getQuestionsFromCardbox: explicit cardbox --------------------------------

def test_explicit_cardbox_0_still_jumps_ahead(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, True)

    assert list(quiz) == ["RESCHED0", "DUE1"]


def test_explicit_cardbox_prioritizes_that_cardbox(clock):
    clock.now = BASE
    rows = [
        ("FUTURE1", 5, 1, BASE + DAY),
        ("DUE0", -1, 0, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 1, 2, True)

    assert list(quiz) == ["FUTURE1", "DUE0"]


def test_explicit_cardbox_keeps_due_before_future_within_box(clock):
    clock.now = BASE
    rows = [
        ("FUTURE5", 5, 5, BASE + DAY),
        ("DUE5", -1, 5, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 5, 2, True)

    assert list(quiz) == ["DUE5", "FUTURE5"]


# --- closet/eligibility regressions ------------------------------------------

def test_explicit_cardbox_at_or_above_closet_includes_backlog(clock):
    clock.now = BASE
    rows = [
        ("BACKLOG20", 2, 20, BASE - 100),
        ("DUE1", -1, 1, BASE - 200),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 20, 2, True, closet=10)

    assert list(quiz) == ["BACKLOG20", "DUE1"]


def test_default_keeps_closet_0_backlog_eligibility(clock):
    clock.now = BASE
    rows = [
        ("BACKLOG20", 2, 20, BASE - 100),
        ("DUE1", -1, 1, BASE - 200),
        ("FUTURE5", 5, 0, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 3, False, closet=0)

    # Same eligibility as the old cardbox=0 path (0 >= closet) ...
    assert set(quiz) == {"BACKLOG20", "DUE1", "FUTURE5"}
    # ... but default ordering still puts past-scheduled words first.
    assert list(quiz) == ["DUE1", "BACKLOG20", "FUTURE5"]


# --- getQuestions(): absent vs explicit cardbox plumbing ---------------------

class _FakeResponse:
    status_code = 200

    def json(self):
        return {}


@contextmanager
def get_questions_request(con, payload):
    saved = app.teardown_request_funcs.get(None, [])
    app.teardown_request_funcs[None] = []
    try:
        with app.test_request_context("/getQuestions", method="POST", json=payload):
            g.uuid = "test-user"
            g.headers = {}
            g.con = con
            g.cur = con.cursor()
            yield
    finally:
        app.teardown_request_funcs[None] = saved


@pytest.mark.parametrize("payload,expected", [
    ({"numQuestions": 1}, (0, False)),
    ({"numQuestions": 1, "cardbox": 0}, (0, True)),
    ({"numQuestions": 1, "cardbox": 5}, (5, True)),
])
def test_get_questions_distinguishes_absent_and_explicit_cardbox(
        clock, monkeypatch, payload, expected):
    clock.now = BASE
    con = helpers.make_db([], cleared_until=BASE)
    calls = []

    def fake_questions(num_needed, cardbox, question_length=None,
                       cardbox_requested=True):
        calls.append((cardbox, cardbox_requested))
        return {}

    monkeypatch.setattr(views, "getQuestionsFromCardbox", fake_questions)
    monkeypatch.setattr(views.requests, "post", lambda *a, **k: _FakeResponse())

    with get_questions_request(con, payload):
        views.getQuestions()

    assert calls == [expected]


# --- Sloth: _get_bingo_from_cardbox ------------------------------------------

def test_bingo_default_serves_due_before_future_rescheduled(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUEWORD1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, False)  # pylint: disable=protected-access

    assert result == "DUEWORD1"


def test_bingo_explicit_cardbox_0_jumps_ahead(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUEWORD1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, True)  # pylint: disable=protected-access

    assert result == "RESCHED0"
