// Shared answer area (Invaders / Wall of Words) against blank keys (issue #812).
const { test } = require('node:test');
const assert = require('node:assert');
const { createWindow, makeQuestion, makeAnswerArea, typeAnswer } = require('./support');

test('a blank question serves, scores, and rejects non-answers', function () {
  const { w } = createWindow();
  try {
    const q = makeQuestion(w, 'AAIINR?', ['ANTIAIR', 'DIARIAN']);
    const area = makeAnswerArea(w, q);

    assert.strictEqual(typeAnswer(w, area, 'ZZZZZZ'), 'typo', 'short word is a typo');
    assert.strictEqual(w.$('#answerBox').val(), '', 'answer box clears');

    assert.strictEqual(typeAnswer(w, area, 'AAIINRT'), 'wrong', 'fits but is not an answer');
    assert.strictEqual(w.document.getElementById('invWordsWrongAAIINR?').textContent, ' AAIINRT',
                       'wrong word lands on the question row');

    assert.strictEqual(typeAnswer(w, area, 'ANTIAIR'), 'correct');
    assert.match(w.document.getElementById('invWordsAAIINR?').innerHTML,
                 /AN<span class="blankLetter">T<\/span>IAIR/,
                 'the supplied letter is highlighted');

    assert.strictEqual(typeAnswer(w, area, 'ANTIAIR'), 'duplicate', 'already answered word is a duplicate');
    assert.strictEqual(typeAnswer(w, area, 'DIARIAN'), 'solved');
    assert.strictEqual(q.unanswered.length, 0);
    assert.strictEqual(q.complete, true);
    assert.deepStrictEqual(q.submittedAnswers, [false],
                           'strict mode marks the question wrong after an earlier wrong guess');
    assert.strictEqual(w.document.getElementById('invAlphaDivAAIINR?').parentNode.id, 'invSolvedDiv');
  } finally {
    w.close();
  }
});

test('a plain question still resolves by exact alphagram', function () {
  const { w } = createWindow();
  try {
    const q = makeQuestion(w, 'AAIINRT', ['ANTIAIR']);
    const area = makeAnswerArea(w, q);
    assert.strictEqual(typeAnswer(w, area, 'ANTIAIR'), 'solved');
    assert.deepStrictEqual(q.submittedAnswers, [true]);
  } finally {
    w.close();
  }
});

test('overlapping blanks prefer the question that still needs the word', function () {
  const { w } = createWindow();
  try {
    const b1 = makeQuestion(w, 'AAIINR?', ['ANTIAIR', 'DIARIAN']);
    const b2 = makeQuestion(w, 'AAIINT?', ['ANTIAIR', 'TITANIA']);
    const host = {
      questions: [b1, b2],
      getQuestionByAlpha: w.Quiz.prototype.getQuestionByAlpha,
      getQuestionByAnswer: w.Quiz.prototype.getQuestionByAnswer
    };
    assert.strictEqual(host.getQuestionByAnswer('ANTIAIR'), b1, 'first unanswered candidate wins');
    b1.unanswered = ['DIARIAN'];
    assert.strictEqual(host.getQuestionByAnswer('ANTIAIR'), b2, 'answered question is skipped');
    assert.strictEqual(host.getQuestionByAnswer('AAAAAAA'), undefined, 'no match is a typo');

    // An exact plain alphagram wins over a blank that also fits.
    const plain = makeQuestion(w, 'AAIINRT', ['ANTIAIR']);
    const blank = makeQuestion(w, 'AAIINR?', ['ANTIAIR', 'DIARIAN']);
    const both = {
      questions: [blank, plain],
      getQuestionByAlpha: w.Quiz.prototype.getQuestionByAlpha,
      getQuestionByAnswer: w.Quiz.prototype.getQuestionByAnswer
    };
    assert.strictEqual(both.getQuestionByAnswer('ANTIAIR'), plain, 'exact alpha takes precedence');
  } finally {
    w.close();
  }
});
