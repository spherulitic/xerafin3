"""Shared fakes for the quiz ``submitQuestion`` tests.

Deliberately free of service imports so they can be reused from the test
modules.
"""
import requests


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
        event = (self._responses.pop(0) if len(self._responses) > 1
                 else self._responses[0])
        if isinstance(event, Exception):
            raise event
        return event


def payload(**overrides):
    """A legacy sloth submit: no quiz row and no cardbox row are touched."""
    data = {"question": "AEINRT", "correct": True, "quizid": -1,
            "incrementQ": True, "cardbox": -2}
    data.update(overrides)
    return data
