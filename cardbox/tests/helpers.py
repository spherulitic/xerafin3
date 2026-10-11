"""Shared helpers for the cardbox sweep tests.

The tests exercise the real cardbox sweep functions (``views.newQuiz``) against a
temporary SQLite cardbox, and compare the result with a faithful re-implementation
of the pre-#559 sequence. No Keycloak/MySQL is involved: the request context is
opened directly and ``g`` is populated by hand.
"""
import os
import random
import sqlite3
import sys
from contextlib import contextmanager

# Make the service package (and its studyOrder/xerafinUtil) importable when tests
# are run from the cardbox/ directory.
_SERVICE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _SERVICE_ROOT not in sys.path:
    sys.path.insert(0, _SERVICE_ROOT)

from flask import g  # noqa: E402

from cardbox import app, views  # noqa: E402

SCHEMA = """
create table questions (question varchar(16), correct integer, incorrect integer,
  streak integer, last_correct integer, difficulty integer, cardbox integer,
  next_scheduled integer);
create unique index question_index on questions(question);
create table next_added (question varchar(16), timeStamp integer);
create unique index next_added_question_idx on next_added(question);
create table cleared_until (timeStamp integer);
create table new_words_at (timeStamp integer);
"""


def make_db(rows, cleared_until=0, next_added=()):
    """Build an in-memory cardbox with the given question rows."""
    con = sqlite3.connect(":memory:")
    con.executescript(SCHEMA)
    con.execute("insert into cleared_until values (?)", (cleared_until,))
    con.execute("insert into new_words_at values (?)", (cleared_until + 1,))
    con.executemany(
        "insert into questions (question, correct, incorrect, streak, last_correct, "
        "difficulty, cardbox, next_scheduled) values (?, 0, 0, 0, 0, ?, ?, ?)",
        rows,
    )
    con.executemany("insert into next_added values (?, 0)", [(q,) for q in next_added])
    con.commit()
    return con


@contextmanager
def request_for(con, closet=10, sched_version=0):
    # ``app`` registers close_sqlite as a teardown handler, which closes g.con
    # when the request context pops. Tests own the connection (and an in-memory
    # one cannot be reopened), so suppress teardown for the duration.
    saved = app.teardown_request_funcs.get(None, [])
    app.teardown_request_funcs[None] = []
    try:
        with app.test_request_context("/newQuiz", json={}):
            g.uuid = "test-user"
            g.name = "Test"
            g.closet = closet
            g.schedVersion = sched_version
            g.con = con
            g.cur = con.cursor()
            yield
    finally:
        app.teardown_request_funcs[None] = saved


# --- New (post-#559) sequence: call the real view ------------------------------

def run_new(con, closet=10, sched_version=0):
    with request_for(con, closet, sched_version):
        views.newQuiz()
    return con


# --- Reference: the pre-#559 sequence, re-implemented verbatim ----------------

def run_old(con, now, closet=10, sched_version=0):
    with request_for(con, closet, sched_version):
        # dbClean()
        con.execute("delete from next_added where question in "
                    "(select question from questions where next_scheduled is not null)")
        con.execute("update questions set difficulty = null where cardbox is null")
        # closetSweep()
        con.execute("update questions set difficulty = 0 where cardbox < ? "
                    "and difficulty not in (1, 5)", (closet,))
        con.execute("update questions set difficulty = 2 where cardbox >= ? "
                    "and difficulty not in (1, 5) and next_scheduled < ?", (closet, now))
        # futureSweep() (unchanged by #559)
        views.futureSweep()
        # release step from newQuiz()
        cleared = con.execute("select * from cleared_until").fetchone()[0]
        con.execute("update questions set difficulty = -1 where difficulty = 0 "
                    "and next_scheduled < ?", (max(now, cleared),))
        con.commit()
    return con


def difficulty_map(con):
    return dict(con.execute("select question, difficulty from questions").fetchall())


# --- Generators ----------------------------------------------------------------

_CARD_BOXES = [None, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20]
_DIFFICULTIES = [-1, 0, 1, 2, 3, 4, 5, 50, None]


def gen_rows(n, base, cleared_until, seed=0):
    """Generate question rows spanning every difficulty, cardbox and time edge."""
    rnd = random.Random(seed)
    day = 86400
    offsets = [
        -10 * day, -day, -1, 0, 1, 60, 3600, day,
        cleared_until - base - 1, cleared_until - base, cleared_until - base + 1,
        10 * day, 26 * day, 60 * day, 86 * day, 100 * day, 430 * day, 10 * day * 100,
        None,
    ]
    rows = []
    for i in range(n):
        cb = rnd.choice(_CARD_BOXES)
        diff = rnd.choice(_DIFFICULTIES)
        offset = rnd.choice(offsets)
        ns = None if offset is None else base + offset
        rows.append((f"Q{i:06d}", diff, cb, ns))
    return rows


def large_realistic_rows(n, base, cleared_until, seed=0):
    """Skew like a real heavy account: mostly released (-1) low-cardbox words."""
    rnd = random.Random(seed)
    rows = []
    for i in range(n):
        roll = rnd.random()
        if roll < 0.75:
            cb, diff, ns = rnd.choice([0, 1, 2]), -1, base - rnd.randint(1, 10 * 86400)
        elif roll < 0.9:
            cb, diff, ns = rnd.randint(3, 12), 4, base + rnd.randint(1, 400) * 86400
        else:
            cb, diff, ns = rnd.randint(0, 12), rnd.choice([0, 2, 3, 5, 50]), base - rnd.randint(0, 86400)
        rows.append((f"Q{i:06d}", diff, cb, ns))
    return rows
