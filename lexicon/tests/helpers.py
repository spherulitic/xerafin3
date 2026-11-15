"""Shared fakes for the lexicon blank alphagram tests.

No MongoDB and no Keycloak are involved: the JWT hook is replaced by a fixed
user, and ``g.words`` is a small in-memory stand-in for the words collection.
"""

TEST_UUID = "test-user-uuid"


def alphagram(word):
    """Return the canonical alphagram for a word."""
    return "".join(sorted(word))


class FakeWords:
    """Minimal stand-in for the Mongo words collection.

    Supports the two shapes the service uses: ``find`` with an ``alphagram``
    filter (scalar or ``$in``) and ``aggregate`` for random word sampling.
    Sampled batches are scripted per round, one list per aggregate call.
    """

    def __init__(self, words=None, docs=None, samples=None):
        if docs is None:
            docs = [{"word": word, "alphagram": alphagram(word)} for word in words or []]
        self.docs = docs
        self.samples = [list(batch) for batch in samples or []]
        self.find_calls = []
        self.aggregate_calls = []

    def find(self, query, projection=None):  # pylint: disable=unused-argument
        """Serve an alphagram lookup and remember the query."""
        self.find_calls.append(query)
        wanted = query.get("alphagram")
        if isinstance(wanted, dict) and "$in" in wanted:
            wanted = set(wanted["$in"])
        else:
            wanted = {wanted}
        return [dict(doc) for doc in self.docs if doc["alphagram"] in wanted]

    def aggregate(self, pipeline):
        """Return the next scripted word sample, or nothing once exhausted."""
        self.aggregate_calls.append(pipeline)
        if not self.samples:
            return []
        return [{"word": word} for word in self.samples.pop(0)]


def sampled_lengths(fake):
    """Return the requested word length for each aggregate call."""
    return [
        pipeline[0]["$match"]["$expr"]["$eq"][1]
        for pipeline in fake.aggregate_calls
    ]
