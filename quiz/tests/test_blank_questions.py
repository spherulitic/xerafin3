"""Backend support for blank (``?``) question keys (issue #808).

A blank question key is a canonical alphagram with a trailing wildcard, e.g.
``AAIINR?``. Its answers are the union over the 26 substitutions, and it is
scored and reset exactly like a normal question, but it must never touch the
cardbox.
"""
import json

from quiz import views

from helpers import (TEST_UUID, FakeResponse, RoutedShim,
                     statements_containing)

QUIZID = 42
BLANK = "AAIINR?"
ANSWERS = ["ANTIAIR", "DIARIAN"]


def blank_submit(**overrides):
    """A submit payload shaped like the one the quiz page sends."""
    data = {"question": BLANK, "correct": True, "quizid": QUIZID,
            "incrementQ": False, "servedCardbox": None,
            "cardboxEligible": False}
    data.update(overrides)
    return data


def write_quiz_json(tmp_path, alphagrams):
    (tmp_path / f"{QUIZID}.json").write_text(json.dumps({"alphagrams": alphagrams}))


def cardbox_urls(shim):
    return [call["url"] for call in shim.calls if "cardbox" in call["url"]]


# --- store ---------------------------------------------------------------

def test_activate_quiz_stores_blank_key(client, db, monkeypatch, tmp_path):
    write_quiz_json(tmp_path, [BLANK])
    monkeypatch.setattr(views, "QUIZJSON_PATH", str(tmp_path))
    db.script_one(None, (0,))      # not bookmarked, no progress rows yet

    resp = client.post("/activateQuiz", json={"quizidList": [QUIZID]})

    assert resp.status_code == 200
    inserts = statements_containing(db, "insert into quiz_user_detail")
    assert len(inserts) == 1
    assert inserts[0][1] == (QUIZID, TEST_UUID, BLANK)


def test_new_quiz_stores_blank_key(client, db, monkeypatch, tmp_path):
    write_quiz_json(tmp_path, [BLANK])
    monkeypatch.setattr(views, "QUIZJSON_PATH", str(tmp_path))
    db.script_one(("Daily Blank 7s",), (0,))
    shim = RoutedShim({
        "http://cardbox:5000/getCardboxScore": FakeResponse(200, {"score": 5}),
        "http://stats:5000/getUserStatsToday": FakeResponse(
            200, {"questionsAnswered": 0, "startScore": 5}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/newQuiz", json={"isCardbox": False, "quizid": QUIZID})

    assert resp.status_code == 200
    inserts = statements_containing(db, "insert into quiz_user_detail")
    assert len(inserts) == 1
    assert inserts[0][1] == [QUIZID, TEST_UUID, BLANK]
    assert resp.get_json()["score"] == 5


# --- serve ---------------------------------------------------------------

def test_serve_blank_question_returns_union_answers(client, db, monkeypatch):
    db.script_all([(BLANK,)])
    shim = RoutedShim({
        "http://lexicon:5000/getManyAnagrams": FakeResponse(200, {BLANK: ANSWERS}),
        "http://lexicon:5000/getWordInfo": FakeResponse(200, {
            "definition": "", "front_hooks": "", "back_hooks": "",
            "lexicon_symbols": "",
        }),
        "http://lexicon:5000/getDots": FakeResponse(200, [False, False]),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/getQuestions", json={
        "isCardbox": False, "numQuestions": 1, "quizid": QUIZID})

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["eof"] is False
    question = body["questions"][0]
    assert question["alpha"] == BLANK
    assert question["answers"] == ANSWERS
    assert question["cardboxEligible"] is False
    assert question["cardbox"] is None
    assert cardbox_urls(shim) == []

    lookups = [call for call in shim.calls
               if call["url"].endswith("/getManyAnagrams")]
    assert lookups[0]["json"] == {"alphagrams": [BLANK]}


def test_serving_an_exhausted_quiz_sets_eof_without_calling_lexicon(
        client, db, monkeypatch):
    """An empty batch must not hit getManyAnagrams, which rejects empty lists."""
    db.script_all([])
    shim = RoutedShim({})
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/getQuestions", json={
        "isCardbox": False, "numQuestions": 1, "quizid": QUIZID})

    assert resp.status_code == 200
    assert resp.get_json() == {"questions": [], "eof": True}
    assert shim.calls == []


# --- submit --------------------------------------------------------------

def test_submit_correct_marks_blank_question_and_skips_cardbox(
        client, db, monkeypatch):
    shim = RoutedShim({
        "http://cardbox:5000/getCardboxScore": FakeResponse(200, {"score": 9}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/submitQuestion", json=blank_submit())

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["cardboxUpdated"] is False
    assert body["score"] == 9
    assert body["aux"] == {"alpha": BLANK, "aux": {}}
    assert cardbox_urls(shim) == ["http://cardbox:5000/getCardboxScore"]

    updates = statements_containing(db, "update quiz_user_detail set correct=1")
    assert updates[0][1] == (BLANK, TEST_UUID, QUIZID)


def test_submit_wrong_marks_blank_question_and_skips_cardbox(
        client, db, monkeypatch):
    shim = RoutedShim({
        "http://cardbox:5000/getCardboxScore": FakeResponse(200, {"score": 9}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/submitQuestion", json=blank_submit(correct=False))

    assert resp.status_code == 200
    body = resp.get_json()
    assert body["cardboxUpdated"] is False
    assert cardbox_urls(shim) == ["http://cardbox:5000/getCardboxScore"]

    updates = statements_containing(db, "update quiz_user_detail set incorrect=1")
    assert updates[0][1] == (BLANK, TEST_UUID, QUIZID)


def test_submit_blank_ignores_explicit_cardbox_target(client, db, monkeypatch):
    """A stray moveToCardbox request must not put a blank key in the cardbox."""
    shim = RoutedShim({
        "http://cardbox:5000/getCardboxScore": FakeResponse(200, {"score": 9}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/submitQuestion", json=blank_submit(setCardbox=3))

    assert resp.status_code == 200
    assert resp.get_json()["cardboxUpdated"] is False
    assert cardbox_urls(shim) == ["http://cardbox:5000/getCardboxScore"]


# --- addQuizToCardbox ----------------------------------------------------

def test_add_quiz_to_cardbox_skips_blank_alphas(client, db, monkeypatch):
    db.script_all([(BLANK,), ("AEINRT",)], [("AEINRT",)])
    shim = RoutedShim({
        "http://cardbox:5000/addManyToCardbox": FakeResponse(200, {"numAdded": 1}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/addQuizToCardbox", json={
        "quizid": QUIZID, "action": "all"})

    body = resp.get_json()[0]
    assert body["numAdded"] == 1
    assert shim.calls[0]["json"] == {
        "alphas": ["AEINRT"], "correctAlphas": ["AEINRT"]}


def test_add_quiz_to_cardbox_skips_blank_alphas_for_wrong(client, db, monkeypatch):
    db.script_all([(BLANK,), ("AEINRT",)], [("AEINRT",)])
    shim = RoutedShim({
        "http://cardbox:5000/addManyToCardbox": FakeResponse(200, {"numAdded": 1}),
    })
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/addQuizToCardbox", json={
        "quizid": QUIZID, "action": "wrong"})

    body = resp.get_json()[0]
    assert body["numAdded"] == 1
    assert body["action"] == "wrong"
    assert shim.calls[0]["json"] == {
        "alphas": ["AEINRT"], "correctAlphas": ["AEINRT"]}


def test_add_quiz_to_cardbox_all_blank_makes_no_call(client, db, monkeypatch):
    db.script_all([(BLANK,)], [])
    shim = RoutedShim({})
    monkeypatch.setattr(views, "requests", shim)

    resp = client.post("/addQuizToCardbox", json={
        "quizid": QUIZID, "action": "all"})

    assert resp.get_json()[0]["numAdded"] == 0
    assert shim.calls == []


# --- reset and listing ---------------------------------------------------

def test_reset_quiz_clears_blank_question_progress(client, db):
    resp = client.post("/resetQuiz", json={"quizid": QUIZID, "action": "resetall"})

    assert resp.status_code == 200
    assert resp.get_json() == {"reset": QUIZID, "action": "resetall"}
    updates = statements_containing(db, "update quiz_user_detail set locked=0")
    assert len(updates) == 1
    assert "completed=0" in updates[0][0]
    assert updates[0][1] == (QUIZID, TEST_UUID)


def test_reset_quiz_list_includes_blank_quiz(client, db):
    resp = client.post("/resetQuizList", json={
        "searchType": "quizid", "quizid": QUIZID, "action": "resetall"})

    assert resp.status_code == 200
    assert resp.get_json() == {"count": 1, "quizids": [QUIZID]}
    updates = statements_containing(db, "update quiz_user_detail set locked=0")
    assert updates[0][1] == [TEST_UUID, QUIZID]


def test_get_quiz_list_counts_blank_quiz_progress(client, db):
    db.script_all(
        [(QUIZID, "Daily Blank 7s", 50)],
        [(QUIZID, 50, 24, 22, None)],
        [],
    )

    resp = client.post("/getQuizList", json={
        "searchType": "quizid", "quizid": QUIZID})

    quiz = resp.get_json()["0"]
    assert quiz["quizsize"] == 50
    assert quiz["untried"] == 26
    assert quiz["unsolved"] == 28
    assert quiz["correct"] == 22
    assert quiz["incorrect"] == 2
    assert quiz["status"] == "Active"
