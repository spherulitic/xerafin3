"""Regression tests for the /getRankings hardening (#791).

No MySQL and no login service: ``runQuery`` is replaced per class with canned
rows keyed on the query shape, and ``getUserData`` is replaced with the records
``login:getUserNamesAndPhotos`` actually returns for deleted users (no
``countryId`` key).

The three cases here are the ones that used to raise, in the same endpoint as
the #650/#660 health tickets:

- ``SlothRankings`` indexed ``user_info["countryId"]`` directly.
- ``Rankings`` left ``self.period`` unset for an unrecognized timeframe.
- ``Metaranks`` indexed ``rankData[0]`` on an empty page.
"""
import datetime

import pytest
from flask import g

from stats import app, views

MY_UUID = "my-uuid"


@pytest.fixture
def identity():
    """A request identity, as before_request would install it."""
    with app.app_context():
        g.uuid = MY_UUID
        g.name = "Me Myself"
        g.photo = "images/me.png"
        g.countryId = 44
        yield


def fake_run(results):
    """Return a runQuery stand-in that answers by SQL substring.

    ``results`` is an ordered list of (substring, rows); the first match wins.
    """
    def run(self):
        sql = " ".join(self.query.split())
        for needle, rows in results:
            if needle in sql:
                return list(rows)
        raise AssertionError(f"unexpected query: {sql}")
    return run


def test_rankings_falls_back_to_today_for_unknown_timeframe(monkeypatch, identity):
    """A bogus timeframe used to leave self.period unset -> AttributeError."""
    monkeypatch.setattr(views.Rankings, "runQuery", fake_run([
        ("COUNT(DISTINCT userid)", [(1,)]),
        ("WHERE userid=", []),
        ("LIMIT", [(3, MY_UUID)]),
        ("FROM leaderboard", [(3, MY_UUID)]),
    ]))
    monkeypatch.setattr(views, "getUserData", lambda uuids: [])

    rank = views.Rankings({"timeframe": "fortnight"})

    assert rank.period == "today"
    assert rank.getRankings()["period"] == "today"


def test_sloth_rankings_tolerates_user_without_country_id(monkeypatch, identity):
    """login's not-found branch omits countryId; a direct index used to 500."""
    monkeypatch.setattr(views.SlothRankings, "runQuery", fake_run([
        ("COUNT(DISTINCT userid)", [(1,)]),
        ("WHERE userid=", []),
        ("LIMIT", [(5, "ghost-uuid")]),
        ("FROM sloth_completed", [(5, MY_UUID)]),
    ]))
    monkeypatch.setattr(views, "getUserData", lambda uuids: [
        {"userid": "ghost-uuid",
         "name": "Unknown User",
         "photo": "images/unknown_player.gif"}])

    rankings = views.SlothRankings({"view": "SL"}).getRankings()["rankings"]

    assert rankings[0]["rank"] == 1
    assert rankings[0]["countryId"] == 0
    assert rankings[0]["users"][0]["name"] == "Unknown User"


def test_metaranks_handles_empty_page_with_user_present(monkeypatch, identity):
    """An empty page for a ranked user used to index rankData[0] -> IndexError."""
    today = datetime.date.today()
    monkeypatch.setattr(views.Metaranks, "runQuery", fake_run([
        ("SELECT COUNT(userid) FROM", [(30,)]),
        ("WHERE userid=", [(5, today, MY_UUID)]),
        ("LIMIT", []),
        ("FROM leaderboard", [(MY_UUID, 5, today)]),
    ]))
    monkeypatch.setattr(views, "getUserData", lambda uuids: [])

    rankings = views.Metaranks({}).getRankings()["rankings"]

    assert len(rankings) == 1
    assert rankings[0]["rank"] == 1
    assert rankings[0]["isMe"] is True
