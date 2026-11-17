"""Shared fakes for the quiz service tests.

Deliberately free of service imports so they can be reused from the test
modules.
"""
import requests

TEST_UUID = "test-user-uuid"


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
        self._record.append(dict(method="GET", url=url, **kwargs))
        return self._next()

    def post(self, url, **kwargs):
        self._record.append(dict(method="POST", url=url, **kwargs))
        return self._next()

    def _next(self):
        event = (self._responses.pop(0) if len(self._responses) > 1
                 else self._responses[0])
        if isinstance(event, Exception):
            raise event
        return event


class RoutedShim:
    """Answers requests by URL, recording every call in order.

    Useful when a handler calls several endpoints and the order depends on the
    data under test. An unscripted URL is an error, which keeps tests honest
    about which services a path touches.
    """

    RequestException = requests.RequestException

    def __init__(self, routes):
        self._routes = dict(routes)
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append(dict(method="GET", url=url, **kwargs))
        return self._reply(url)

    def post(self, url, **kwargs):
        self.calls.append(dict(method="POST", url=url, **kwargs))
        return self._reply(url)

    def _reply(self, url):
        if url not in self._routes:
            raise AssertionError(f"unexpected request to {url}")
        return self._routes[url]


class FakeCursor:
    """Scripted stand-in for a MySQLdb cursor.

    Records every ``execute`` and serves queued ``fetchone``/``fetchall``
    results in call order, so a test can assert on the SQL a handler issued
    without a live database.
    """

    def __init__(self):
        self.statements = []
        self._all = []
        self._one = []

    def script_all(self, *batches):
        """Queue fetchall() results, one batch per call."""
        self._all.extend(batches)
        return self

    def script_one(self, *rows):
        """Queue fetchone() results, one row per call."""
        self._one.extend(rows)
        return self

    def execute(self, statement, params=None):
        self.statements.append((statement, params))

    def fetchall(self):
        return self._all.pop(0) if self._all else []

    def fetchone(self):
        return self._one.pop(0) if self._one else None


def statements_containing(cursor, fragment):
    """Return [(sql, params)] for recorded statements matching *fragment*."""
    fragment = fragment.lower()
    return [(sql, params) for sql, params in cursor.statements
            if fragment in sql.lower()]


def payload(**overrides):
    """A legacy sloth submit: no quiz row and no cardbox row are touched."""
    data = {"question": "AEINRT", "correct": True, "quizid": -1,
            "incrementQ": True, "cardbox": -2}
    data.update(overrides)
    return data
