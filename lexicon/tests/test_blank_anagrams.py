"""Serving tests for blank ('?') alphagrams in /getManyAnagrams.

The contract: a key is uppercase, the fixed letters sorted, with a single
trailing '?'. Its answers are the union over the 26 substitutions, so the
test vector AAIINR? -> ANTIAIR (blank = T) and DIARIAN (blank = D).
"""
import pytest

from helpers import alphagram


def post(client, payload):
    """POST a getManyAnagrams payload."""
    return client.post("/getManyAnagrams", json=payload)


def test_blank_expands_to_all_substitutions(make_client):
    """AAIINR? returns both words, and the whole request is one query."""
    client, fake = make_client(words=["ANTIAIR", "DIARIAN", "BAKER"])

    response = post(client, {"alphagrams": ["AAIINR?"]})

    assert response.status_code == 200
    assert response.get_json() == {"AAIINR?": ["ANTIAIR", "DIARIAN"]}
    assert len(fake.find_calls) == 1
    wanted = fake.find_calls[0]["alphagram"]["$in"]
    assert "AAIINRT" in wanted   # blank = T
    assert "AADIINR" in wanted   # blank = D
    assert len(wanted) == 26


def test_plain_key_behaves_as_before(make_client):
    """A plain alphagram still returns exactly its own words."""
    client, fake = make_client(words=["ANTIAIR", "DIARIAN"])

    response = post(client, {"alphagrams": ["AAIINRT"]})

    assert response.get_json() == {"AAIINRT": ["ANTIAIR"]}
    assert fake.find_calls[0]["alphagram"] == {"$in": ["AAIINRT"]}


def test_plain_and_blank_keys_do_not_cross_contaminate(make_client):
    """A plain key that is also an expansion of a blank keeps its own answers."""
    client, _ = make_client(words=["ANTIAIR", "DIARIAN"])

    body = post(client, {"alphagrams": ["AAIINRT", "AAIINR?"]}).get_json()

    assert body == {"AAIINRT": ["ANTIAIR"], "AAIINR?": ["ANTIAIR", "DIARIAN"]}


def test_blank_without_answers_keeps_its_key(make_client):
    """An unanswerable blank is reported as an empty list, not dropped."""
    client, _ = make_client(words=["BAKER"])

    body = post(client, {"alphagrams": ["ZZZZZ?"]}).get_json()

    assert body == {"ZZZZZ?": []}


def test_duplicate_keys_are_collapsed(make_client):
    """Repeated keys are answered once rather than duplicating answers."""
    client, _ = make_client(words=["ANTIAIR", "DIARIAN"])

    body = post(client, {"alphagrams": ["AAIINR?", "AAIINR?"]}).get_json()

    assert list(body) == ["AAIINR?"]
    assert body["AAIINR?"] == ["ANTIAIR", "DIARIAN"]


@pytest.mark.parametrize("bad", [
    "aaiinr?",      # lowercase
    "aaiinr",       # lowercase plain
    "AAIINR?X",     # wildcard is not trailing
    "?AAIINR",      # wildcard is not trailing
    "AAIIN?R",      # wildcard is not trailing
    "AAIINR??",     # more than one wildcard
    "AAIIN R?",     # non-letter
    "AA-IINR",
    "",             # empty
    "NIARIA?",      # fixed letters not sorted
    "NIARIA",       # plain letters not sorted
    "AAIINR? ",     # trailing space
])
def test_invalid_keys_are_rejected(make_client, bad):
    """Non-canonical keys are a 400 rather than a silent empty answer."""
    client, _ = make_client(words=["ANTIAIR"])

    response = post(client, {"alphagrams": [bad]})

    assert response.status_code == 400
    assert "error" in response.get_json()


@pytest.mark.parametrize("payload", [
    {},
    {"alphagrams": None},
    {"alphagrams": []},
    {"alphagrams": "AAIINRT"},
    {"alphagrams": [1]},
])
def test_bad_payloads_are_rejected(make_client, payload):
    """The alphagram list itself must be a non-empty list of strings."""
    client, _ = make_client(words=[])

    response = post(client, payload)

    assert response.status_code == 400
    assert "error" in response.get_json()


def test_malformed_json_is_rejected(make_client):
    """Undecodable bodies produce a JSON 400, not a 500."""
    client, _ = make_client(words=[])

    response = client.post("/getManyAnagrams", data="{",
                           content_type="application/json")

    assert response.status_code == 400


@pytest.mark.parametrize("body", [[], "AAIINRT", 7])
def test_non_object_body_is_rejected(make_client, body):
    """A body that is not a JSON object is a 400, not a 500."""
    client, _ = make_client(words=[])

    response = post(client, body)

    assert response.status_code == 400


def test_blank_answers_are_sorted(make_client):
    """Blank answers are ordered across expansions; plain order is untouched."""
    client, _ = make_client(words=["DIARIAN", "ANTIAIR", "ZEBRA"])

    blank = post(client, {"alphagrams": ["AAIINR?"]}).get_json()["AAIINR?"]

    assert blank == sorted(blank)


def test_alphagram_helper_matches_test_vector():
    """The fake collection must agree with the real alphagram convention."""
    assert alphagram("ANTIAIR") == "AAIINRT"
    assert alphagram("DIARIAN") == "AADIINR"
