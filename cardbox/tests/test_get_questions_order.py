"""Ordering and eligibility tests for getQuestions / getNextBingo.

Two distinctions are covered:

* A missing ``cardbox`` in the request means "default ordering", while an
  explicit ``cardbox: 0`` means "serve cardbox 0 first".
* Difficulty 5 (rescheduled) words are normally available only through
  ``cleared_until``. The explicit Rescheduled mode serves them ahead of time.

Closeting/difficulty eligibility is otherwise unchanged.
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


def questions(con, cardbox, num_needed, cardbox_requested,
              rescheduled=False, **request_kwargs):
    with helpers.request_for(con, **request_kwargs):
        return views.getQuestionsFromCardbox(
            num_needed, cardbox, None, cardbox_requested, rescheduled)


# --- Normal mode: ordering ----------------------------------------------------

def test_default_orders_by_cardbox_then_due_date(clock):
    clock.now = BASE
    rows = [
        ("CB2", -1, 2, BASE - 3600),
        ("CB12", -1, 12, BASE - 7200),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    # Cardbox 2 comes first even though cardbox 12 is more overdue.
    assert list(quiz) == ["CB2", "CB12"]


def test_default_orders_due_words_by_cardbox_then_time(clock):
    clock.now = BASE
    rows = [
        ("DUE_CB0", -1, 0, BASE - 60),
        ("DUE_CB2", -1, 2, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["DUE_CB0", "DUE_CB2"]


def test_default_treats_rescheduled_within_cutoff_as_due(clock):
    clock.now = BASE
    rows = [
        ("PAST5", 5, 0, BASE - 7200),
        ("FUTURE5", 5, 0, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["PAST5", "FUTURE5"]


# --- Normal mode: cleared_until cutoff ---------------------------------------

def test_default_excludes_rescheduled_beyond_cleared_until(clock, release_calls):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False)

    assert list(quiz) == ["DUE1"]
    assert release_calls == [1]


def test_default_includes_rescheduled_at_cutoff_boundary(clock):
    clock.now = BASE
    rows = [("BOUNDARY5", 5, 0, BASE)]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 1, False)

    assert list(quiz) == ["BOUNDARY5"]


def test_explicit_cardbox_also_excludes_rescheduled_beyond_cutoff(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    # Cardbox 0 would win if the future diff5 row were still eligible.
    quiz = questions(con, 0, 1, True)

    assert list(quiz) == ["DUE1"]


# --- Normal mode: explicit cardbox ordering ----------------------------------

def test_explicit_cardbox_0_still_jumps_ahead_within_cutoff(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    quiz = questions(con, 0, 2, True)

    assert list(quiz) == ["RESCHED0", "DUE1"]


def test_explicit_cardbox_prioritizes_that_cardbox(clock):
    clock.now = BASE
    rows = [
        ("FUTURE1", 5, 1, BASE + DAY),
        ("DUE0", -1, 0, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    quiz = questions(con, 1, 2, True)

    assert list(quiz) == ["FUTURE1", "DUE0"]


def test_explicit_cardbox_keeps_due_before_rescheduled_within_box(clock):
    clock.now = BASE
    rows = [
        ("FUTURE5", 5, 5, BASE + DAY),
        ("DUE5", -1, 5, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    quiz = questions(con, 5, 2, True)

    assert list(quiz) == ["DUE5", "FUTURE5"]


# --- Closet/eligibility regressions ------------------------------------------

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
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    quiz = questions(con, 0, 3, False, closet=0)

    # Same eligibility as the old cardbox=0 path (0 >= closet) ...
    assert set(quiz) == {"BACKLOG20", "DUE1", "FUTURE5"}
    # ... and default ordering is lowest cardbox first.
    assert list(quiz) == ["FUTURE5", "DUE1", "BACKLOG20"]


# --- Rescheduled mode --------------------------------------------------------

def test_rescheduled_mode_returns_only_diff5(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUE1", -1, 1, BASE - 3600),
        ("BACKLOG20", 2, 20, BASE - 100),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 3, False, rescheduled=True)

    assert set(quiz) == {"RESCHED0"}


def test_rescheduled_mode_includes_arbitrarily_future_words(clock):
    clock.now = BASE
    rows = [("FAR5", 5, 0, BASE + 365 * DAY)]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 1, False, rescheduled=True)

    assert list(quiz) == ["FAR5"]


def test_rescheduled_mode_selected_cardbox_then_spills(clock):
    clock.now = BASE
    rows = [
        ("CB1", 5, 1, BASE + 2 * DAY),
        ("CB3", 5, 3, BASE + 3 * DAY),
        ("CB4", 5, 4, BASE + 4 * DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 3, 3, True, rescheduled=True)

    assert list(quiz) == ["CB3", "CB1", "CB4"]


def test_rescheduled_mode_empty_selected_cardbox_falls_back_to_lowest(clock):
    clock.now = BASE
    rows = [
        ("CB2", 5, 2, BASE + 2 * DAY),
        ("CB4", 5, 4, BASE + 4 * DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 5, 2, True, rescheduled=True)

    assert list(quiz) == ["CB2", "CB4"]


def test_rescheduled_mode_default_starts_lowest_and_spills(clock):
    clock.now = BASE
    rows = [
        ("CB2", 5, 2, BASE + 2 * DAY),
        ("CB4A", 5, 4, BASE + 3 * DAY),
        ("CB4B", 5, 4, BASE + 4 * DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 3, False, rescheduled=True)

    assert list(quiz) == ["CB2", "CB4A", "CB4B"]


def test_rescheduled_mode_does_not_release_words(clock, release_calls):
    clock.now = BASE
    rows = [("DUE1", -1, 1, BASE - 3600)]
    con = helpers.make_db(rows, cleared_until=BASE)

    quiz = questions(con, 0, 2, False, rescheduled=True)

    assert quiz == {}
    assert release_calls == []


# --- getQuestions(): absent vs explicit cardbox / rescheduled plumbing -------

class _FakeResponse:
    status_code = 200

    def json(self):
        return {}


@contextmanager
def json_request(con, path, payload):
    saved = app.teardown_request_funcs.get(None, [])
    app.teardown_request_funcs[None] = []
    try:
        with app.test_request_context(path, method="POST", json=payload):
            g.uuid = "test-user"
            g.name = "Test"
            g.headers = {}
            g.closet = 10
            g.schedVersion = 0
            g.con = con
            g.cur = con.cursor()
            yield
    finally:
        app.teardown_request_funcs[None] = saved


@pytest.mark.parametrize("payload,expected", [
    ({"numQuestions": 1}, (0, False, False)),
    ({"numQuestions": 1, "cardbox": 0}, (0, True, False)),
    ({"numQuestions": 1, "cardbox": 5}, (5, True, False)),
    ({"numQuestions": 1, "rescheduled": True}, (0, False, True)),
    ({"numQuestions": 1, "cardbox": 5, "rescheduled": True}, (5, True, True)),
])
def test_get_questions_plumbing(clock, monkeypatch, payload, expected):
    clock.now = BASE
    con = helpers.make_db([], cleared_until=BASE)
    calls = []

    def fake_questions(num_needed, cardbox, question_length=None,
                       cardbox_requested=True, rescheduled=False):
        calls.append((cardbox, cardbox_requested, rescheduled))
        return {}

    monkeypatch.setattr(views, "getQuestionsFromCardbox", fake_questions)
    monkeypatch.setattr(views.requests, "post", lambda *a, **k: _FakeResponse())

    with json_request(con, "/getQuestions", payload):
        views.getQuestions()

    assert calls == [expected]


def test_get_cardbox_stats_reports_rescheduled_counts(clock):
    clock.now = BASE
    rows = [
        ("A5", 5, 0, BASE + DAY),
        ("B5", 5, 0, BASE + 2 * DAY),
        ("C5", 5, 1, BASE + 3 * DAY),
        ("DUE", -1, 0, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with json_request(con, "/getCardboxStats", {"due": True}):
        response = views.getCardboxStats()

    stats = response.get_json()[0]
    assert stats["dueByCardbox"]["rescheduled"] == {"0": 2, "1": 1}


@pytest.mark.parametrize("stored,expected", [
    (BASE + 2 * DAY, BASE + 2 * DAY),
    (BASE - DAY, BASE),
    (0, BASE),
])
def test_get_cardbox_stats_reports_effective_cleared_until(clock, stored, expected):
    clock.now = BASE
    con = helpers.make_db([], cleared_until=stored)

    with json_request(con, "/getCardboxStats", {"due": True}):
        response = views.getCardboxStats()

    stats = response.get_json()[0]
    assert stats["clearedUntil"] == expected


# --- Sloth: _get_bingo_from_cardbox ------------------------------------------

def test_bingo_default_excludes_rescheduled_beyond_cleared_until(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUEWORD1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, False)  # pylint: disable=protected-access

    assert result == "DUEWORD1"


def test_bingo_default_orders_by_cardbox_then_due_date(clock):
    clock.now = BASE
    rows = [
        ("CB12WORD", -1, 12, BASE - 7200),
        ("CB2WORDX", -1, 2, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, False)  # pylint: disable=protected-access

    # Cardbox 2 comes first even though cardbox 12 is more overdue.
    assert result == "CB2WORDX"


def test_bingo_explicit_cardbox_0_jumps_ahead_within_cutoff(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUEWORD1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE + 2 * DAY)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, True)  # pylint: disable=protected-access

    assert result == "RESCHED0"


def test_bingo_explicit_cardbox_still_excludes_beyond_cutoff(clock):
    clock.now = BASE
    rows = [
        ("RESCHED0", 5, 0, BASE + DAY),
        ("DUEWORD1", -1, 1, BASE - 3600),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        result = views._get_bingo_from_cardbox(0, True)  # pylint: disable=protected-access

    assert result == "DUEWORD1"
