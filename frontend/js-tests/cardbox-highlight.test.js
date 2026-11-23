// Answer-pane cardbox affordances (issue #482).
// Grey = not in cardbox and clickable, blue = added to cardbox,
// green = in cardbox, due, answered correctly.
const { test } = require('node:test');
const assert = require('node:assert');
const { createWindow, makeQuestion, makeAnswerArea } = require('./support');

function stubAdd(q) {
  q.added = 0;
  q.addToCardbox = function (onAdded) {
    this.added++;
    if (typeof onAdded === 'function') { onAdded({ status: 'success' }); }
  };
}

function startTable(w, q) {
  const table = new w.QAnswers({ id: 'QAnswers', pare: 'root' });
  table.start({
    words: q.words,
    alpha: q.alpha,
    quizid: q.quizid,
    cardbox: q.cardbox,
    cardboxEligible: q.cardboxEligible,
    question: q
  });
  return table;
}

test('Question.addToCardbox reports only a successful add', async function () {
  const { w } = createWindow();
  try {
    const q = makeQuestion(w, 'AAIINRT', ['ANTIAIR']);
    let added = 0;
    const onAdded = function () { added++; };

    w.fetchWithAuth = function () {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ status: 'success' }); } });
    };
    await q.addToCardbox(onAdded);
    assert.strictEqual(added, 1);

    w.fetchWithAuth = function () {
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ status: 'invalid alphagram' }); } });
    };
    await q.addToCardbox(onAdded);
    assert.strictEqual(added, 1, 'invalid alphagrams are not turned blue');

    w.fetchWithAuth = function () { return Promise.reject(new Error('offline')); };
    await q.addToCardbox(onAdded);
    assert.strictEqual(added, 1, 'failed requests are not turned blue');
  } finally {
    w.close();
  }
});

test('answer area: not-in-cardbox word is grey and clickable, then blue once added', function () {
  const { w } = createWindow();
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    stubAdd(q);
    makeAnswerArea(w, q);
    const div = w.document.getElementById('invAlphaDivANTIAIR');

    assert.strictEqual(div.classList.contains('steelRowedInv'), true, 'starts grey');
    assert.strictEqual(div.classList.contains('blueRowed'), false);
    assert.strictEqual(div.title, 'Click to add to cardbox');

    div.onclick();

    assert.strictEqual(q.added, 1, 'adds the alphagram');
    assert.strictEqual(div.classList.contains('steelRowedInv'), false, 'grey is cleared');
    assert.strictEqual(div.classList.contains('blueRowed'), true, 'turns blue');
    assert.strictEqual(div.onclick, null, 'no longer clickable');
  } finally {
    w.close();
  }
});

test('answer area: words already in the cardbox, cardbox quizzes, and blanks get no affordance', function () {
  let { w } = createWindow();
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    q.cardbox = 3;
    makeAnswerArea(w, q);
    const div = w.document.getElementById('invAlphaDivANTIAIR');
    assert.strictEqual(div.classList.contains('steelRowedInv'), false);
    assert.strictEqual(div.onclick, null);
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    q.quizid = -1;
    q.cardbox = null;
    makeAnswerArea(w, q);
    const div = w.document.getElementById('invAlphaDivANTIAIR');
    assert.strictEqual(div.classList.contains('steelRowedInv'), false, 'cardbox quiz is not clickable');
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const q = makeQuestion(w, 'AAIINR?', ['ANTIAIR']);
    makeAnswerArea(w, q);
    const div = w.document.getElementById('invAlphaDivAAIINR?');
    assert.strictEqual(div.classList.contains('steelRowedInv'), false, 'blank keys never enter the cardbox');
    assert.strictEqual(div.onclick, null);
  } finally {
    w.close();
  }
});

test('answer area: a solved, due question keeps the green highlight', function () {
  let { w } = createWindow();
  try {
    const q = makeQuestion(w, 'AAIINRT', ['ANTIAIR']);
    q.cardbox = 2;
    q.cardboxEligible = true;
    const area = makeAnswerArea(w, q);
    w.$('#answerBox').val('ANTIAIR');
    assert.strictEqual(area.submitAnswer(), 'solved');
    assert.strictEqual(w.document.getElementById('invWordsAAIINRT').classList.contains('highlightRow'), true);
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const q = makeQuestion(w, 'AAIINRT', ['ANTIAIR']);
    q.cardbox = 2;
    q.cardboxEligible = false;
    const area = makeAnswerArea(w, q);
    w.$('#answerBox').val('ANTIAIR');
    assert.strictEqual(area.submitAnswer(), 'solved');
    assert.strictEqual(w.document.getElementById('invWordsAAIINRT').classList.contains('highlightRow'), false,
                       'not due means no cardbox update');
  } finally {
    w.close();
  }
});

test('basic quiz: rows are grey and clickable, then the whole alphagram turns blue', function () {
  const { w } = createWindow();
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR', 'ARTINAI']);
    stubAdd(q);
    const table = startTable(w, q);
    const row = table.rows['ANTIAIR'].output;
    const other = table.rows['ARTINAI'].output;

    assert.strictEqual(row.classList.contains('wordTableHighlightNotInCardbox'), true);
    assert.strictEqual(row.title, 'Click to add to cardbox');

    row.onclick();

    assert.strictEqual(q.added, 1);
    assert.strictEqual(row.classList.contains('wordTableHighlightNotInCardbox'), false);
    assert.strictEqual(row.classList.contains('wordTableHighlightAdded'), true);
    assert.strictEqual(row.onclick, null);
    assert.strictEqual(other.classList.contains('wordTableHighlightAdded'), true,
                       'every word in the alphagram is marked');
  } finally {
    w.close();
  }
});

test('basic quiz: solved due words are green; not-due and cardbox quizzes are not', function () {
  let { w } = createWindow();
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    q.cardbox = 2;
    q.cardboxEligible = true;
    const table = startTable(w, q);
    table.displayRest(0);
    assert.strictEqual(table.rows['ANTIAIR'].output.classList.contains('highlightRow'), true);
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    q.cardbox = 2;
    q.cardboxEligible = false;
    const table = startTable(w, q);
    table.displayRest(0);
    assert.strictEqual(table.rows['ANTIAIR'].output.classList.contains('highlightRow'), false);
    assert.strictEqual(table.rows['ANTIAIR'].output.classList.contains('wordTableHighlightNotInCardbox'), false,
                       'words in the cardbox are not clickable');
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const q = makeQuestion(w, 'ANTIAIR', ['ANTIAIR']);
    q.quizid = -1;
    q.cardbox = null;
    const table = startTable(w, q);
    assert.strictEqual(table.rows['ANTIAIR'].output.classList.contains('wordTableHighlightNotInCardbox'), false,
                       'cardbox quiz rows are not clickable');
  } finally {
    w.close();
  }
});

test('sloth: not-in-cardbox cells are grey, clickable, and turn blue when added', function () {
  const { w } = createWindow();
  try {
    const board = new w.SlothBoard({});
    board.populate(new Set(['ANT', 'TAN']));
    const actions = [];
    board.action = function (action, alpha) { actions.push([action, alpha]); };
    board.endGame({
      wordsRemaining: new Set(),
      toAlpha: function (s) { return s.split('').sort().join(''); },
      questions: { ANT: { endState: 0 } }
    });

    const td = board.tables[3].cells['ANT'].parentNode;
    assert.strictEqual(td.classList.contains('slothNotInBox'), true);

    td.click();
    assert.deepStrictEqual(actions, [['BOARD_ADD_WORD', 'ANT']]);

    board.showAdded('ANT');
    assert.strictEqual(td.classList.contains('slothAdded'), true);

    td.click();
    assert.deepStrictEqual(actions, [['BOARD_ADD_WORD', 'ANT']], 'click handler is removed after adding');
  } finally {
    w.close();
  }
});

test('sloth: missed and partially answered words outside the cardbox are grey too', function () {
  let { w } = createWindow();
  try {
    const board = new w.SlothBoard({});
    board.populate(new Set(['ANT']));
    board.endGame({
      wordsRemaining: new Set(['ANT']),
      toAlpha: function (s) { return s.split('').sort().join(''); },
      questions: { ANT: { endState: 4 } }
    });
    assert.strictEqual(board.tables[3].cells['ANT'].parentNode.classList.contains('slothMissedNotInBox'), true);
  } finally {
    w.close();
  }

  ({ w } = createWindow());
  try {
    const board = new w.SlothBoard({});
    board.populate(new Set(['ANT']));
    board.endGame({
      wordsRemaining: new Set(),
      toAlpha: function (s) { return s.split('').sort().join(''); },
      questions: { ANT: { endState: 6 } }
    });
    assert.strictEqual(board.tables[3].cells['ANT'].parentNode.classList.contains('slothPartialNotInBox'), true);
  } finally {
    w.close();
  }
});
