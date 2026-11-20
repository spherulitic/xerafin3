"""Periodic quiz generation tests (issue #809).

Blank quizzes must call /getRandomBlankAlphas with the stored answer length,
validate the returned keys, and never store a partial or duplicate quiz. The
daily run is also idempotent per day unless explicitly forced.
"""
import itertools
import json
import string
from datetime import datetime

from quiz import views

from helpers import (TEST_UUID, FakeResponse, RequestsShim, RoutedShim,
                     statements_containing)

BLANK_URL = "http://lexicon:5000/getRandomBlankAlphas"
NORMAL_URL = "http://lexicon:5000/getRandomAlphas"

BLANK7_ROW = (22, "Daily Blank 7s", 50, "Daily", 8, 7, 7)
BLANK8_ROW = (23, "Daily Blank 8s", 50, "Daily", 8, 8, 8)
NORMAL_ROW = (7, "Daily 8s", 2, "Daily", 1, 8, 8)


class FixedDateTime(datetime):
    """datetime with a fixed now() so the tests do not depend on today."""

    @classmethod
    def now(cls, tz=None):
        return datetime(2026, 11, 20, 12, 0, 0)


def blank_keys(quantity, length, first=None):
    """Return *quantity* unique canonical blank keys of *length*."""
    keys = [first] if first else []
    for combo in itertools.combinations_with_replacement(
            string.ascii_uppercase, length - 1):
        key = "".join(combo) + "?"
        if key not in keys:
            keys.append(key)
        if len(keys) == quantity:
            return keys
    raise AssertionError("not enough blank keys")


def configure(monkeypatch, tmp_path, shim):
    """Point generation at the temp JSON dir and the scripted HTTP shim."""
    monkeypatch.setattr(views, "QUIZJSON_PATH", str(tmp_path))
    monkeypatch.setattr(views, "datetime", FixedDateTime)
    monkeypatch.setattr(views, "requests", shim)


def insert_params(db):
    """Return the parameters of the single quiz_master insert."""
    inserts = statements_containing(db, "insert into quiz_master")
    assert len(inserts) == 1
    return inserts[0][1]


def test_blank_7s_uses_answer_length_and_stores_keys(client, db, monkeypatch,
                                                      tmp_path):
    keys = blank_keys(50, 7, first="AAIINR?")
    shim = RoutedShim({BLANK_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 200
    assert response.get_json()["generated"] == [22]
    assert shim.calls[0]["url"] == BLANK_URL
    assert shim.calls[0]["json"] == {
        "quantity": 50, "length": 7, "minAnswers": 1, "maxAnswers": 10,
    }

    params = insert_params(db)
    assert params[0] == 42
    assert params[1] == "Daily Blank 7s 20 Nov 2026"
    assert params[2] == 50
    assert params[3] == 22
    assert params[4] == TEST_UUID
    assert params[5] == 8
    assert params[6] == 7

    stored = json.loads((tmp_path / "42.json").read_text())
    assert stored["alphagrams"] == keys
    assert "AAIINR?" in stored["alphagrams"]


def test_blank_8s_uses_stored_length(client, db, monkeypatch, tmp_path):
    keys = blank_keys(50, 8, first="AAIINRT?")
    shim = RoutedShim({BLANK_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK8_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 200
    assert shim.calls[0]["json"]["length"] == 8
    params = insert_params(db)
    assert params[5] == 8
    assert params[6] == 8
    stored = json.loads((tmp_path / "42.json").read_text())
    assert all(len(key) == 8 for key in stored["alphagrams"])


def test_normal_daily_still_uses_random_alphas(client, db, monkeypatch,
                                               tmp_path):
    keys = ["AAIINRT", "BEINORT"]
    shim = RoutedShim({NORMAL_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([NORMAL_ROW])
    db.script_one((7,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 200
    assert shim.calls[0]["url"] == NORMAL_URL
    assert shim.calls[0]["json"] == {"quantity": 2, "lengths": [8]}
    params = insert_params(db)
    assert params[5] == 1
    assert params[6] == 8
    stored = json.loads((tmp_path / "8.json").read_text())
    assert stored["alphagrams"] == keys


def test_blank_400_is_a_failure_and_stores_nothing(client, db, monkeypatch,
                                                   tmp_path):
    shim = RoutedShim({
        BLANK_URL: FakeResponse(
            400, {"error": "found only 10 of 50 blank alphagrams"}),
    })
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 500
    body = response.get_json()
    assert body["status"] == "failed"
    assert body["generated"] == []
    assert body["failed"][0]["sub_id"] == 22
    assert "found only 10 of 50" in body["failed"][0]["error"]
    assert statements_containing(db, "insert into quiz_master") == []
    assert statements_containing(db, "set sub_id = null") == []
    assert not (tmp_path / "42.json").exists()


def test_duplicate_blank_keys_are_rejected(client, db, monkeypatch, tmp_path):
    keys = blank_keys(50, 7, first="AAIINR?")
    keys[-1] = keys[0]
    shim = RoutedShim({BLANK_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 500
    assert "duplicate blank key" in response.get_json()["failed"][0]["error"]
    assert statements_containing(db, "insert into quiz_master") == []


def test_wrong_length_blank_keys_are_rejected(client, db, monkeypatch,
                                              tmp_path):
    keys = blank_keys(50, 6, first="AAIIN?")
    shim = RoutedShim({BLANK_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 500
    assert "invalid blank key" in response.get_json()["failed"][0]["error"]
    assert statements_containing(db, "insert into quiz_master") == []


def test_blank_row_with_a_length_range_is_rejected(client, db, monkeypatch,
                                                   tmp_path):
    row = (22, "Daily Blank 7s", 50, "Daily", 8, 7, 8)
    shim = RoutedShim({})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([row])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 500
    assert "needs a single length" in response.get_json()["failed"][0]["error"]
    assert shim.calls == []
    assert statements_containing(db, "insert into quiz_master") == []


def test_existing_quiz_today_is_skipped(client, db, monkeypatch, tmp_path):
    shim = RoutedShim({})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((1,))

    response = client.post("/generatePeriodicQuizzes")

    assert response.status_code == 200
    body = response.get_json()
    assert body["skipped"] == [22]
    assert body["generated"] == []
    assert shim.calls == []
    assert statements_containing(db, "insert into quiz_master") == []
    assert len(statements_containing(db, "create_date = CURDATE()")) == 1


def test_force_regenerates_existing_quiz(client, db, monkeypatch, tmp_path):
    keys = blank_keys(50, 7, first="AAIINR?")
    shim = RoutedShim({BLANK_URL: FakeResponse(200, keys)})
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW])
    db.script_one((41,))

    response = client.post("/generatePeriodicQuizzes", json={"force": True})

    assert response.status_code == 200
    assert response.get_json()["generated"] == [22]
    assert statements_containing(db, "create_date = CURDATE()") == []


def test_failure_does_not_stop_later_quizzes(client, db, monkeypatch,
                                             tmp_path):
    keys8 = blank_keys(50, 8, first="AAIINRT?")
    calls = []
    shim = RequestsShim([
        FakeResponse(400, {"error": "blank failed"}),
        FakeResponse(200, keys8),
    ], calls)
    configure(monkeypatch, tmp_path, shim)
    db.script_all([BLANK7_ROW, BLANK8_ROW])
    db.script_one((41,), (42,))

    response = client.post("/generatePeriodicQuizzes?force=1")

    assert response.status_code == 500
    body = response.get_json()
    assert body["generated"] == [23]
    assert body["failed"][0]["sub_id"] == 22
    assert len(calls) == 2
    assert calls[0]["url"] == BLANK_URL
    assert calls[1]["url"] == BLANK_URL
    assert insert_params(db)[3] == 23
