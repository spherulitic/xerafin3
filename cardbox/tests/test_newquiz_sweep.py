"""Equivalence + regression tests for the #559 newQuiz sweep write-avoidance.

The cardbox sweep (``dbClean`` + ``closetSweep`` + ``futureSweep`` + the release
step in ``newQuiz``) is normalized at the start of every quiz. The optimization
in #559 only skips writes that a later step would undo, so the final difficulty
state must be identical to the pre-change sequence.
"""
import pytest

import helpers


BASE = 1_700_000_000


@pytest.mark.parametrize("seed", range(12))
@pytest.mark.parametrize("sched_version", [0, 1, 2, 3])
@pytest.mark.parametrize("closet", [5, 10])
def test_new_matches_old(clock, seed, sched_version, closet):
    clock.now = BASE
    for cleared in (BASE - 1000, BASE, BASE + 100000):
        rows = helpers.gen_rows(500, BASE, cleared, seed=seed)

        con_old = helpers.make_db(rows, cleared_until=cleared)
        helpers.run_old(con_old, BASE, closet=closet, sched_version=sched_version)

        con_new = helpers.make_db(rows, cleared_until=cleared)
        helpers.run_new(con_new, closet=closet, sched_version=sched_version)

        old_map = helpers.difficulty_map(con_old)
        new_map = helpers.difficulty_map(con_new)
        diffs = {q for q in old_map if old_map[q] != new_map.get(q)}
        assert not diffs, (
            f"{len(diffs)} rows differ (seed={seed}, v={sched_version}, "
            f"closet={closet}, cleared={cleared}); sample="
            f"{[(q, old_map[q], new_map.get(q)) for q in list(diffs)[:5]]}"
        )


@pytest.mark.parametrize("seed", range(6))
@pytest.mark.parametrize("sched_version", [0, 3])
def test_sweep_is_idempotent(clock, seed, sched_version):
    """Running the sweep twice must not change the state the second time."""
    clock.now = BASE
    rows = helpers.gen_rows(400, BASE, BASE, seed=seed)

    con = helpers.make_db(rows, cleared_until=BASE)
    helpers.run_new(con, sched_version=sched_version)
    first = helpers.difficulty_map(con)

    helpers.run_new(con, sched_version=sched_version)
    second = helpers.difficulty_map(con)

    diffs = {q for q in first if first[q] != second.get(q)}
    assert not diffs, f"second sweep changed {len(diffs)} rows: " \
                      f"{[(q, first[q], second.get(q)) for q in list(diffs)[:5]]}"


def test_new_writes_far_fewer_rows(clock):
    """The whole point of #559: don't rewrite rows a later step restores.

    Uses ``Connection.total_changes`` (row-writes) rather than wall time so the
    assertion is deterministic in CI.
    """
    clock.now = BASE
    rows = helpers.large_realistic_rows(20000, BASE, BASE, seed=1)

    con_old = helpers.make_db(rows, cleared_until=BASE)
    start = con_old.total_changes
    helpers.run_old(con_old, BASE)
    old_writes = con_old.total_changes - start

    con_new = helpers.make_db(rows, cleared_until=BASE)
    start = con_new.total_changes
    helpers.run_new(con_new)
    new_writes = con_new.total_changes - start

    assert helpers.difficulty_map(con_new) == helpers.difficulty_map(con_old)
    assert new_writes < old_writes / 2, f"old={old_writes} new={new_writes}"


def test_released_rows_at_cleared_until_boundary(clock):
    """A released (-1) low-cardbox row whose next_scheduled is at/after the
    release cutoff must end at 0, exactly as the legacy sequence left it.

    Regression guard for the one boundary the write-avoidance could get wrong.
    """
    clock.now = BASE
    cleared = BASE + 100000
    # cardbox 9 is below the closet (so closetSweep's backlog reset applies) and
    # has a 60-day lookahead, so all four rows are in-window; the only thing that
    # can differ is the cleared_until release cutoff.
    rows = [
        ("boundary_before", -1, 9, cleared - 1),   # < cutoff -> re-released
        ("boundary_at", -1, 9, cleared),           # >= cutoff -> stays 0
        ("boundary_after", -1, 9, cleared + 1),    # >= cutoff -> stays 0
        ("past", -1, 9, BASE - 1),                 # -> released
    ]
    con_old = helpers.make_db(rows, cleared_until=cleared)
    helpers.run_old(con_old, BASE)
    con_new = helpers.make_db(rows, cleared_until=cleared)
    helpers.run_new(con_new)

    old_map = helpers.difficulty_map(con_old)
    new_map = helpers.difficulty_map(con_new)
    assert old_map == new_map
    assert new_map["boundary_before"] == -1
    assert new_map["boundary_at"] == 0
    assert new_map["boundary_after"] == 0
    assert new_map["past"] == -1
