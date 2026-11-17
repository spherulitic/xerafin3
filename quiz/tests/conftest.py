"""Fixtures for the quiz service tests.

Keycloak is bypassed by replacing the ``before_request`` hook that verifies the
JWT, and ``g.con`` is a scripted fake cursor so no MySQL server is needed. HTTP
calls to other services are scripted per test (see ``helpers``).
"""
import os
import sys

import pytest

# Make the service package importable when tests are run from quiz/.
_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from flask import g  # noqa: E402

from quiz import app  # noqa: E402

from helpers import FakeCursor, TEST_UUID  # noqa: E402


@pytest.fixture
def db():
    """Scripted MySQL cursor exposed to handlers as ``g.con``."""
    return FakeCursor()


@pytest.fixture
def client(monkeypatch, db):
    """Flask test client with the JWT check replaced by a fixed user."""
    def hook():
        g.uuid = TEST_UUID
        g.headers = {"Authorization": "Bearer test-token"}
        g.mysqlcon = None
        g.con = db

    monkeypatch.setitem(app.before_request_funcs, None, [hook])
    monkeypatch.setitem(app.config, "PROPAGATE_EXCEPTIONS", False)
    return app.test_client()
