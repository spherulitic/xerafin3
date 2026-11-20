"""Browse/search tests for blank quizzes (issue #810)."""
from quiz import views

from helpers import TEST_UUID, statements_containing


def daily_search(client, db, **overrides):
    """Run a Daily browse search through the bulk-reset endpoint."""
    body = {
        "searchType": "daily",
        "minDate": "2026-11-20",
        "maxDate": "2026-11-20",
        "minLength": 7,
        "maxLength": 7,
    }
    body.update(overrides)
    db.script_all([(10,), (11,)])
    return client.post("/resetQuizList", json=body)


def test_daily_search_includes_blank_type(client, db):
    response = daily_search(client, db)

    assert response.status_code == 200
    assert response.get_json() == {"count": 2, "quizids": [10, 11]}
    sql, params = statements_containing(
        db, "from quiz_master where quiz_type")[0]
    assert "in (%s, %s)" in sql.lower()
    assert params == [views.QUIZ_TYPE_DAILY, views.QUIZ_TYPE_BLANK,
                      "2026-11-20", "2026-11-20", 7, 7]
    update = statements_containing(db, "update quiz_user_detail set locked=0")
    assert update[0][1] == [TEST_UUID, 10, 11]


def test_daily_search_passes_the_date_and_length_window(client, db):
    response = daily_search(client, db, minLength=8, maxLength=9)

    assert response.status_code == 200
    _, params = statements_containing(
        db, "from quiz_master where quiz_type")[0]
    assert params[2:] == ["2026-11-20", "2026-11-20", 8, 9]
