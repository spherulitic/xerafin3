"""Shared fakes for the stats ``/increment`` tests.

Deliberately free of service imports so they can be used from conftest and the
test modules alike.
"""
import requests

TEST_UUID = "test-user-uuid"


class FakeResponse:
    """Minimal stand-in for requests.Response."""

    def __init__(self, payload=None, status=200):
        self.status_code = status
        self._payload = payload

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} error")


class RequestsShim:
    """Serves the cardbox score and records every call."""

    RequestException = requests.RequestException

    def __init__(self, record, probe=None):
        self._record = record
        self._probe = probe

    def get(self, url, **kwargs):
        entry = dict(url=url, **kwargs)
        if self._probe is not None:
            entry["statements_so_far"] = self._probe()
        self._record.append(entry)
        if url.endswith("/getCardboxScore"):
            return FakeResponse({"score": 77})
        raise AssertionError(f"unexpected HTTP call: {url}")


class FakeCursor:
    """Just enough of a mysqlclient cursor for the leaderboard paths.

    ``exists``/``questions`` model today's row; ``insert_errors`` are raised
    (in order) by insert attempts, which is how the deadlock retry is tested.
    """

    def __init__(self, exists=False, questions=5, insert_errors=()):
        self.exists = exists
        self.questions = questions
        self.insert_errors = list(insert_errors)
        self.statements = []        # (normalised sql, args)
        self.insert_attempts = 0
        self._row = None

    def execute(self, query, args=None):
        sql = " ".join(query.split())
        low = sql.lower()

        if low.startswith("insert into leaderboard"):
            self.insert_attempts += 1
            if self.insert_errors:
                error = self.insert_errors.pop(0)
                if error is not None:
                    raise error
            self.statements.append((sql, args))
            if self.exists:
                self.questions += 1
            else:
                self.exists = True
                self.questions = 1
            self._row = None
            return

        self.statements.append((sql, args))
        if low.startswith("select 1 from leaderboard"):
            self._row = (1,) if self.exists else None
        elif low.startswith("select questionsanswered"):
            self._row = (self.questions, 77) if self.exists else None
        else:
            raise AssertionError(f"unexpected statement: {sql}")

    def fetchone(self):
        return self._row

    def statements_starting(self, prefix):
        prefix = prefix.lower()
        return [(sql, args) for sql, args in self.statements
                if sql.lower().startswith(prefix)]
