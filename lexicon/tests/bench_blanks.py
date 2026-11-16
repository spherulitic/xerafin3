#!/usr/bin/env python3
"""Benchmark the blank alphagram endpoints against a real Mongo + DAWG.

Run inside the lexicon image, with the mounted word-data and a populated
lexicon Mongo, e.g.:

    podman run --rm --network host \
        -v "$PWD/lexicon:/app" -v /var/lib/xerafin/word-data:/app/data:ro \
        -e MONGO_URL=mongodb://localhost:27017 word_db \
        x-lexicon:latest sh -c \
        "pip install -q -r requirements-test.txt && python3 tests/bench_blanks.py"

It reports DAWG load time, one 26-way expansion through /getManyAnagrams, and
a full 50-question generation for lengths 7 and 8, including the number of
round trips to Mongo per generation.
"""
import os
import statistics
import sys
import time

from flask import g
from pymongo import MongoClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lexicon import app, views  # noqa: E402  pylint: disable=wrong-import-position

DAWG_PATH = os.environ.get("DAWG_PATH", "/app/data/csw24.dawg")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_INITDB_DATABASE", "word_db")

DB = MongoClient(MONGO_URL)[DB_NAME]


class RecordingCollection:
    """Delegates to the real collection and counts Mongo round trips."""

    def __init__(self, collection):
        self.collection = collection
        self.aggregates = 0
        self.finds = 0

    def aggregate(self, pipeline):
        """Count and forward an aggregation."""
        self.aggregates += 1
        return self.collection.aggregate(pipeline)

    def find(self, *args, **kwargs):
        """Count and forward a find."""
        self.finds += 1
        return self.collection.find(*args, **kwargs)

    def reset(self):
        """Zero the counters."""
        self.aggregates = 0
        self.finds = 0


WORDS = RecordingCollection(DB["words"])
CLIENT = app.test_client()


def hook():
    """Serve the real words collection without Keycloak."""
    g.uuid = "bench"
    g.headers = {}
    g.words = WORDS
    g.dawg_filename = DAWG_PATH


app.before_request_funcs[None] = [hook]
app.config["PROPAGATE_EXCEPTIONS"] = True


def timed(label, func, repeat=5):
    """Run func repeat times and print min/median wall time in ms."""
    samples = []
    result = None
    for _ in range(repeat):
        start = time.perf_counter()
        result = func()
        samples.append((time.perf_counter() - start) * 1000)
    print(f"{label:<44} min {min(samples):7.2f} ms   median {statistics.median(samples):7.2f} ms")
    return result


def main():
    """Print the benchmark report."""
    print(f"words in collection: {DB['words'].estimated_document_count():,}")

    dawg_index = timed("DAWG load (cold, uncached)",
                       lambda: (views.load_dawg.cache_clear(),
                                views.load_dawg(DAWG_PATH))[1],
                       repeat=20)
    assert "AAIINRT" in dawg_index

    def expand():
        response = CLIENT.post("/getManyAnagrams", json={"alphagrams": ["AAIINR?"]})
        assert response.status_code == 200
        return response.get_json()

    answers = timed("expansion /getManyAnagrams (1 blank)", expand)
    print(f"  AAIINR? -> {answers['AAIINR?']}")

    for length in (7, 8):
        def generate():
            response = CLIENT.post("/getRandomBlankAlphas",
                                   json={"quantity": 50, "length": length})
            assert response.status_code == 200, response.get_json()
            return response.get_json()

        WORDS.reset()
        keys = timed(f"generation length {length} (50 keys)", generate, repeat=3)
        WORDS.reset()
        generate()   # one instrumented run, counted below
        print(f"  keys={len(keys)} aggregates={WORDS.aggregates} "
              f"finds={WORDS.finds} per generation")
        print(f"  example: {keys[:5]}")


if __name__ == "__main__":
    main()
