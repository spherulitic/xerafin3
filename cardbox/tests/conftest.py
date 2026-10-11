import pytest

from cardbox import views


class _Clock:
    def __init__(self, t):
        self.now = t

    def __call__(self):
        return self.now


@pytest.fixture
def clock(monkeypatch):
    """Freeze ``time.time()`` as seen by the cardbox views."""
    c = _Clock(1_700_000_000)
    monkeypatch.setattr(views.time, "time", c)
    return c
