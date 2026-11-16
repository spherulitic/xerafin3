"""Tests for /getRandomBlankAlphas.

Sampling is scripted: each ``aggregate`` call returns the next batch of words,
and the fake collection supplies the answer counts. Cores are made from words
with a single distinct letter (AAAAAAA -> AAAAAA) so the drop-a-letter step is
deterministic.
"""
import pytest

from helpers import sampled_lengths


# Synthetic docs: answer counts are 1 (AAAAAA), 11 (BBBBBB), 3 (DDDDDD).
# More than seven words cannot share a seven-letter alphagram in real data, so
# the words here are just identifiers - only the alphagram is read.
DOCS = (
    [{"word": "AAAAAAZ", "alphagram": "AAAAAAZ"}]
    + [{"word": "AAAAAAAZ", "alphagram": "AAAAAAAZ"}]
    + [{"word": f"BBBBBBZ{i}", "alphagram": "BBBBBBZ"} for i in range(11)]
    + [{"word": f"DDDDDDZ{i}", "alphagram": "DDDDDDZ"} for i in range(3)]
)

AAAA = "AAAAAAA"
BBBB = "BBBBBBB"
CCCC = "CCCCCCC"   # sampled but has no answers at all
DDDD = "DDDDDDD"


def post(client, payload):
    """POST a getRandomBlankAlphas payload."""
    return client.post("/getRandomBlankAlphas", json=payload)


def test_filters_and_returns_requested_quantity(make_client):
    """Cores outside 1-10 answers are dropped; the rest come back as '?' keys."""
    client, fake = make_client(docs=DOCS,
                               samples=[[AAAA, BBBB, CCCC], [DDDD]])

    response = post(client, {"quantity": 2, "length": 7})

    assert response.status_code == 200
    assert response.get_json() == ["AAAAAA?", "DDDDDD?"]
    assert sampled_lengths(fake) == [7, 7]
    assert len(fake.aggregate_calls) == 2


def test_keys_are_canonical_and_unique(make_client):
    """Every key ends in '?' and is as long as the requested answer length."""
    client, _ = make_client(docs=DOCS, samples=[[AAAA, DDDD]])

    keys = post(client, {"quantity": 2, "length": 7}).get_json()

    assert len(keys) == 2
    assert len(set(keys)) == 2
    assert all(key.endswith("?") and len(key) == 7 for key in keys)
    assert all(key == "".join(sorted(key[:-1])) + "?" for key in keys)


def test_duplicate_candidates_are_not_repeated(make_client):
    """A core sampled twice in one batch is only counted and accepted once."""
    client, fake = make_client(docs=DOCS, samples=[[AAAA, AAAA]])

    keys = post(client, {"quantity": 1, "length": 7}).get_json()

    assert keys == ["AAAAAA?"]
    assert len(fake.find_calls) == 1
    assert len(fake.find_calls[0]["alphagram"]["$in"]) == 26


def test_min_answers_is_enforced(make_client):
    """A core with one answer is rejected when two are requested."""
    client, _ = make_client(docs=DOCS, samples=[[AAAA], [DDDD]])

    keys = post(client, {"quantity": 1, "length": 7, "minAnswers": 2}).get_json()

    assert keys == ["DDDDDD?"]


def test_max_answers_default_is_ten(make_client):
    """The 11-answer core is rejected under the default bounds."""
    client, _ = make_client(docs=DOCS, samples=[[BBBB]])

    response = post(client, {"quantity": 1, "length": 7})

    assert response.status_code == 400


def test_budget_is_bounded_and_shortfall_is_rejected(make_client):
    """When the constraints cannot be met the caller gets a 400, not a short list."""
    client, fake = make_client(docs=DOCS,
                               samples=[[BBBB]] * 10)

    response = post(client, {"quantity": 1, "length": 7})

    assert response.status_code == 400
    assert "found only 0 of 1" in response.get_json()["error"]
    assert len(fake.aggregate_calls) == 2   # budget 200, batch 100


def test_no_words_of_the_requested_length_is_a_400(make_client):
    """An empty sample stops the loop and reports a shortfall."""
    client, _ = make_client(docs=DOCS, samples=[[]])

    response = post(client, {"quantity": 1, "length": 7})

    assert response.status_code == 400
    assert "found only 0 of 1" in response.get_json()["error"]


def test_length_is_the_answer_length(make_client):
    """Words are sampled one letter longer than the core."""
    client, fake = make_client(docs=DOCS, samples=[["AAAAAAAA"]])

    keys = post(client, {"quantity": 1, "length": 8}).get_json()

    assert sampled_lengths(fake) == [8]
    assert keys == ["AAAAAAA?"]
    assert len(keys[0]) == 8


@pytest.mark.parametrize("payload", [
    {"length": 7},                                  # quantity missing
    {"quantity": 1},                                # length missing
    {"quantity": 0, "length": 7},
    {"quantity": 501, "length": 7},
    {"quantity": "1", "length": 7},
    {"quantity": 1.5, "length": 7},
    {"quantity": True, "length": 7},
    {"quantity": 1, "length": 1},
    {"quantity": 1, "length": 16},
    {"quantity": 1, "length": "7"},
    {"quantity": 1, "length": 7, "minAnswers": 0},
    {"quantity": 1, "length": 7, "minAnswers": 11, "maxAnswers": 10},
    {"quantity": 1, "length": 7, "minAnswers": 101},
    {"quantity": 1, "length": 7, "maxAnswers": "10"},
])
def test_absurd_requests_are_rejected_before_sampling(make_client, payload):
    """Invalid parameters are a 400 and cost no aggregation calls."""
    client, fake = make_client(docs=DOCS)

    response = post(client, payload)

    assert response.status_code == 400
    assert "error" in response.get_json()
    assert not fake.aggregate_calls


def test_malformed_json_is_rejected(make_client):
    """Undecodable bodies produce a JSON 400, not a 500."""
    client, _ = make_client(docs=DOCS)

    response = client.post("/getRandomBlankAlphas", data="{",
                           content_type="application/json")

    assert response.status_code == 400


@pytest.mark.parametrize("body", [[], "length 7", 7])
def test_non_object_body_is_rejected(make_client, body):
    """A body that is not a JSON object is a 400, not a 500."""
    client, fake = make_client(docs=DOCS)

    response = post(client, body)

    assert response.status_code == 400
    assert not fake.aggregate_calls
