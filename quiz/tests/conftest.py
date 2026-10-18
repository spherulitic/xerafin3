"""Fixtures for the quiz ``submitQuestion`` tests.

The handler is driven with a legacy sloth payload (``quizid`` -1, ``cardbox``
-2), which touches no database rows, and the stats/cardbox HTTP calls are
scripted per test. Keycloak is bypassed by replacing the ``before_request``
hook that verifies the JWT.
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

TEST_UUID = "test-user-uuid"


@pytest.fixture
def client(monkeypatch):
    """Flask test client with the JWT check replaced by a fixed user."""
    def hook():
        g.uuid = TEST_UUID
        g.headers = {"Authorization": "Bearer test-token"}
        g.mysqlcon = None

    monkeypatch.setitem(app.before_request_funcs, None, [hook])
    monkeypatch.setitem(app.config, "PROPAGATE_EXCEPTIONS", False)
    return app.test_client()
