"""Fixtures for the stats ``/increment`` tests.

No MySQL or Keycloak is involved: the JWT check is replaced by a fixed user,
``g.con`` is a fake cursor that records statements and can inject InnoDB-style
errors, and the cardbox HTTP call is served from a shim.
"""
import os
import sys

import pytest

# Make the service package importable when tests are run from stats/.
_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from flask import g  # noqa: E402

from stats import app, views  # noqa: E402

from helpers import FakeCursor, RequestsShim, TEST_UUID  # noqa: E402


@pytest.fixture
def cursor():
    return FakeCursor()


@pytest.fixture
def uuid():
    return TEST_UUID


@pytest.fixture
def cardbox(monkeypatch):
    """Stub the cardbox service; returns the list of HTTP calls."""
    calls = []
    monkeypatch.setattr(views, "requests", RequestsShim(calls))
    return calls


@pytest.fixture
def client(monkeypatch, cursor):
    """Flask test client with the JWT check replaced by a fixed user."""
    def hook():
        g.uuid = TEST_UUID
        g.headers = {"Authorization": "Bearer test-token"}
        g.mysqlcon = None
        g.con = cursor

    monkeypatch.setitem(app.before_request_funcs, None, [hook])
    monkeypatch.setitem(app.config, "PROPAGATE_EXCEPTIONS", False)
    return app.test_client()


@pytest.fixture
def deadlock():
    return views.mysql.OperationalError(
        1213, "Deadlock found when trying to get lock; try restarting transaction")
