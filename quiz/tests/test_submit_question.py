"""Regression tests for #726: a stats failure must not abort submitQuestion.

The old code did ``requests.get(...).json()`` on the stats response, so the 500
HTML page from the #725 deadlock raised JSONDecodeError and took the whole
submit with it, discarding the cardbox reschedule and quiz progress.
"""
import requests

from quiz import views


class FakeResponse:
    """Minimal stand-in for requests.Response."""

    def __init__(self, status, payload=None):
        self.status_code = status
        self._payload = payload
        self.text = "<html>error</html>"

    def json(self):
        if self._payload is None:
            raise ValueError("Expecting value: line 1 column 1 (char 0)")
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} error")


class RequestsShim:
    """Plays back scripted responses; the last one repeats."""

    RequestException = requests.RequestException

    def __init__(self, responses, record):
        self._responses = list(responses)
        self._record = record

    def get(self, url, **kwargs):
        self._record.append(dict(url=url, **kwargs))
        event = self._responses.pop(0) if len(self._responses) > 1 else self._responses[0]
        if isinstance(event, Exception):
            raise event
        return event


def install(monkeypatch, *events):
    calls = []
    monkeypatch.setattr(views, "requests", RequestsShim(events, calls))
    return calls


def payload(**overrides):
    data = {"question": "AEINRT", "correct": True, "quizid": -1,
            "incrementQ": True, "cardbox": -2}
    data.update(overrides)
    return data


def submit(client, **overrides):
    return client.post("/submitQuestion", json=payload(**overrides))


def test_stats_success_returns_counts(client, monkeypatch):
    calls = install(monkeypatch,
                    FakeResponse(200, {"questionsAnswered": 42, "startScore": 100}))
    resp = submit(client)

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["qAnswered"] == 42
    assert body["startScore"] == 100
    assert len(calls) == 1
    assert calls[0]["url"] == "http://stats:5000/increment"
    assert isinstance(calls[0]["timeout"], (int, float))


def test_stats_500_html_is_not_fatal(client, monkeypatch):
    """The #726 regression: an HTML 500 used to raise JSONDecodeError."""
    calls = install(monkeypatch, FakeResponse(500))
    resp = submit(client)

    assert resp.status_code == 200
    body = resp.get_json()
    assert "qAnswered" not in body
    assert "startScore" not in body
    assert len(calls) == 2          # one retry


def test_stats_500_then_success_is_retried(client, monkeypatch):
    calls = install(monkeypatch,
                    FakeResponse(500),
                    FakeResponse(200, {"questionsAnswered": 7, "startScore": 5}))
    resp = submit(client)

    assert resp.status_code == 200
    assert resp.get_json()["qAnswered"] == 7
    assert len(calls) == 2


def test_stats_timeout_is_retried(client, monkeypatch):
    calls = install(monkeypatch,
                    requests.Timeout("slow"),
                    FakeResponse(200, {"questionsAnswered": 8, "startScore": 5}))
    resp = submit(client)

    assert resp.status_code == 200
    assert resp.get_json()["qAnswered"] == 8
    assert len(calls) == 2


def test_stats_401_still_propagates(client, monkeypatch):
    calls = install(monkeypatch, FakeResponse(401, {"error": "Unauthorized"}))
    resp = submit(client)

    assert resp.status_code == 401
    assert resp.get_json() == {"error": "Unauthorized"}
    assert len(calls) == 1


def test_non_json_200_is_not_fatal(client, monkeypatch):
    install(monkeypatch, FakeResponse(200))
    resp = submit(client)

    assert resp.status_code == 200
    assert "qAnswered" not in resp.get_json()


def test_milestone_chat_fires_when_count_is_known(client, monkeypatch):
    sent = []
    monkeypatch.setattr(views, "submitMilestoneChat", sent.append)
    install(monkeypatch,
            FakeResponse(200, {"questionsAnswered": 50, "startScore": 1}))
    submit(client)

    assert sent == [50]


def test_milestone_chat_skipped_when_stats_fails(client, monkeypatch):
    sent = []
    monkeypatch.setattr(views, "submitMilestoneChat", sent.append)
    install(monkeypatch, FakeResponse(500))
    resp = submit(client)

    assert resp.status_code == 200
    assert sent == []


def test_cardbox_work_survives_stats_failure(client, monkeypatch):
    """A failed increment must not discard the cardbox reschedule."""
    monkeypatch.setattr(views, "_cardbox_op",
                        lambda alpha, target, correct: ({"aux": {"cardbox": 3}}, 42))
    install(monkeypatch, FakeResponse(500))

    resp = submit(client, setCardbox=3)

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["cardboxUpdated"] is True
    assert body["score"] == 42
    assert "qAnswered" not in body
