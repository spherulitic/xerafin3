"""The alphagram DAWG is loaded once per process, not once per request."""
import dawg

from lexicon import views


def test_dawg_is_loaded_once(make_client, tmp_path):
    """Three /returnValidAlphas calls share a single DAWG load."""
    path = str(tmp_path / "test.dawg")
    dawg.CompletionDAWG(["AAIINRT", "AADIINR"]).save(path)
    client, _ = make_client(dawg_path=path)

    for _ in range(3):
        response = client.post("/returnValidAlphas",
                               json={"alphas": ["AAIINRT", "ZZZ"]})
        assert response.status_code == 200
        assert response.get_json() == ["AAIINRT"]

    info = views.load_dawg.cache_info()
    assert (info.misses, info.hits) == (1, 2)
