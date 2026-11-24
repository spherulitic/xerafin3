// Sloth end-game sequencing (#755).
// The board is rendered synchronously after Sloth.stop() calls end(), so every
// endState must be known before end() awaits the first submission.
const { test } = require('node:test');
const assert = require('node:assert');
const { createWindow } = require('./support');

test('SlothQuiz.end sets every end state before the first submit', async function () {
  const { w } = createWindow();
  try {
    const quiz = new w.SlothQuiz([
      { alpha: 'ANT', words: ['ANT', 'TAN'], auxInfo: { cardbox: 2, difficulty: 1 } },
      { alpha: 'AB', words: ['AB', 'BA'], auxInfo: { cardbox: 1, difficulty: 1 } }
    ], 'ANT');

    Object.values(quiz.questions).forEach(function (v) {
      v.unanswered.clear(); // completed questions are the ones that submit
    });

    const pending = [];
    Object.values(quiz.questions).forEach(function (v) {
      v.submitQuestion = function () {
        return new Promise(function (resolve) { pending.push(resolve); });
      };
    });

    const done = quiz.end();

    Object.values(quiz.questions).forEach(function (v) {
      assert.notStrictEqual(v.endState, undefined, 'board can render every state');
    });
    assert.strictEqual(pending.length, 1, 'submissions stay serial');

    pending[0]();
    for (let i = 0; i < 5 && pending.length < 2; i++) { await Promise.resolve(); }
    assert.strictEqual(pending.length, 2, 'the next submit follows the first');

    pending[1]();
    await done;
  } finally {
    w.close();
  }
});
