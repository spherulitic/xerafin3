'''Fixtures for the login service tests.

Keycloak and MySQL are bypassed by replacing the before_request hook with a
fixed user; profile photos are written to a per-test temporary directory.
'''
import os
import sys

import pytest

# Make the service package importable when tests are run from login/.
_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from flask import g  # noqa: E402

from login import app, views  # noqa: E402

from helpers import TEST_UUID  # noqa: E402


@pytest.fixture
def client(monkeypatch):
    '''Flask test client with the JWT check replaced by a fixed user.'''
    def hook():
        g.uuid = TEST_UUID
        g.headers = {'Authorization': 'Bearer test-token'}
        g.mysqlcon = None

    monkeypatch.setitem(app.before_request_funcs, None, [hook])
    monkeypatch.setitem(app.config, 'PROPAGATE_EXCEPTIONS', False)
    return app.test_client()


@pytest.fixture
def photo_dir(tmp_path, monkeypatch):
    '''Redirect profile image writes to a temporary directory.'''
    monkeypatch.setattr(views, 'USER_PHOTO_DIR', str(tmp_path))
    return tmp_path


@pytest.fixture
def keycloak(monkeypatch):
    '''Record setCardboxPrefs calls instead of talking to Keycloak.'''
    calls = []

    def record(params=None):
        calls.append(params)

    monkeypatch.setattr(views, 'setCardboxPrefs', record)
    return calls
