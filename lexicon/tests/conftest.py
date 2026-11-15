"""Fixtures for the lexicon blank alphagram tests.

Keycloak is bypassed by replacing the ``before_request`` hook that verifies the
JWT; ``g.words`` is a scripted in-memory fake.
"""
import os
import sys

import pytest

# Make the service package importable when tests are run from lexicon/.
_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from flask import g  # noqa: E402

from lexicon import app, views  # noqa: E402

from helpers import FakeWords, TEST_UUID  # noqa: E402


@pytest.fixture(autouse=True)
def clear_dawg_cache():
    """Keep the process-wide DAWG cache from leaking between tests."""
    views.load_dawg.cache_clear()
    yield
    views.load_dawg.cache_clear()


@pytest.fixture
def make_client(monkeypatch):
    """Return a factory building a test client over a scripted collection."""
    def _make(words=None, docs=None, samples=None, dawg_path=None):
        fake = FakeWords(words=words, docs=docs, samples=samples)

        def hook():
            g.uuid = TEST_UUID
            g.headers = {"Authorization": "Bearer test-token"}
            g.words = fake
            g.dawg_filename = dawg_path or "/nonexistent/csw24.dawg"

        monkeypatch.setitem(app.before_request_funcs, None, [hook])
        monkeypatch.setitem(app.config, "PROPAGATE_EXCEPTIONS", False)
        return app.test_client(), fake

    return _make
