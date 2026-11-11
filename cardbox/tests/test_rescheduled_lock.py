"""Tests for the difficulty-6 rescheduled lock state.

Difficulty 5 words that are served in a quiz become 6 instead of 3, so an
abandoned quiz cannot turn them back into ordinary/unlocked rows. At the next
newQuiz, 6 is returned to 5.
"""
import helpers

from cardbox import views  # noqa: E402


BASE = 1_700_000_000
DAY = 86400


def difficulties(con):
    return helpers.difficulty_map(con)


# --- checkOut ----------------------------------------------------------------

def test_checkout_locks_rescheduled_as_6(clock):
    clock.now = BASE
    rows = [
        ("RESCHED", 5, 0, BASE + DAY),
        ("FUTURE", 4, 0, BASE + DAY),
        ("DUE", -1, 0, BASE - 1),
        ("BACKLOG", 2, 20, BASE - 1),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        for question in ("RESCHED", "FUTURE", "DUE", "BACKLOG"):
            views.checkOut(question, True)

    assert difficulties(con) == {
        "RESCHED": 6,
        "FUTURE": 3,
        "DUE": 3,
        "BACKLOG": 3,
    }


def test_checkout_lock_is_idempotent_for_rescheduled(clock):
    clock.now = BASE
    con = helpers.make_db([("LOCKED", 6, 0, BASE + DAY)], cleared_until=BASE)

    with helpers.request_for(con):
        views.checkOut("LOCKED", True)

    assert difficulties(con)["LOCKED"] == 6


def test_checkout_unlock_returns_rescheduled_to_5(clock):
    clock.now = BASE
    rows = [
        ("RESCHED_LOCKED", 6, 0, BASE + DAY),
        ("NORMAL_LOCKED", 3, 0, BASE + DAY),
        ("UNLOCKED_RESCHED", 5, 0, BASE + DAY),
        ("UNLOCKED", 0, 0, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        for question in ("RESCHED_LOCKED", "NORMAL_LOCKED",
                         "UNLOCKED_RESCHED", "UNLOCKED"):
            views.checkOut(question, False)

    assert difficulties(con) == {
        "RESCHED_LOCKED": 5,
        "NORMAL_LOCKED": 0,
        "UNLOCKED_RESCHED": 5,
        "UNLOCKED": 0,
    }


# --- closetSweep / newQuiz ---------------------------------------------------

def test_closet_sweep_unlocks_rescheduled_locks_on_both_sides(clock):
    clock.now = BASE
    rows = [
        ("BELOW", 6, 0, BASE + DAY),
        ("ABOVE", 6, 20, BASE + DAY),
        ("BELOW_LOCKED", 3, 1, BASE + DAY),
        ("ABOVE_LOCKED", 3, 20, BASE - 1),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con, closet=10):
        views.closetSweep()

    assert difficulties(con) == {
        "BELOW": 5,
        "ABOVE": 5,
        "BELOW_LOCKED": 0,
        "ABOVE_LOCKED": 2,
    }


def test_new_quiz_unlocks_rescheduled_locks(clock):
    clock.now = BASE
    con = helpers.make_db(
        [("LOCKED", 6, 0, BASE + DAY)], cleared_until=BASE)

    with helpers.request_for(con):
        views.newQuiz()

    assert difficulties(con)["LOCKED"] == 5
    assert con.execute(
        "select next_scheduled from questions where question = 'LOCKED'"
    ).fetchone()[0] == BASE + DAY


# --- eligibility / reporting -------------------------------------------------

def test_rescheduled_mode_does_not_serve_locked_rows(clock, monkeypatch):
    clock.now = BASE
    rows = [
        ("LOCKED", 6, 0, BASE + DAY),
        ("AVAILABLE", 5, 0, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)
    monkeypatch.setattr(views, "getAnagrams", lambda alpha: [alpha.lower()])

    with helpers.request_for(con):
        quiz = views.getQuestionsFromCardbox(2, 0, None, True, True)

    assert set(quiz) == {"AVAILABLE"}


def test_normal_mode_does_not_serve_locked_rows(clock, monkeypatch):
    clock.now = BASE
    con = helpers.make_db([("LOCKED", 6, 0, BASE - 1)], cleared_until=BASE)
    monkeypatch.setattr(views, "getAnagrams", lambda alpha: [alpha.lower()])
    monkeypatch.setattr(views, "makeWordsAvailable", lambda needed: None)

    with helpers.request_for(con):
        quiz = views.getQuestionsFromCardbox(1, 0, None, True, False)

    assert quiz == {}


def test_rescheduled_stats_include_locked_rows(clock):
    clock.now = BASE
    rows = [
        ("A", 5, 0, BASE + DAY),
        ("B", 6, 0, BASE + 2 * DAY),
        ("C", 6, 1, BASE + 3 * DAY),
        ("D", 4, 1, BASE + 4 * DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        assert views.getRescheduledByCardbox() == {0: 2, 1: 1}


def test_aux_info_reports_locked_rescheduled_as_5(clock):
    clock.now = BASE
    con = helpers.make_db([("LOCKED", 6, 0, BASE + DAY)], cleared_until=BASE)

    with helpers.request_for(con):
        assert views.getAuxInfo("LOCKED")["aux"]["difficulty"] == 5


def test_current_due_treats_locked_rescheduled_like_rescheduled(clock):
    clock.now = BASE
    rows = [
        ("DUE5", 5, 0, BASE - 1),
        ("DUE6", 6, 1, BASE - 1),
        ("FUTURE6", 6, 2, BASE + DAY),
    ]
    con = helpers.make_db(rows, cleared_until=BASE)

    with helpers.request_for(con):
        due = views.getCurrentDue()

    assert due == {0: 1, 1: 1}
