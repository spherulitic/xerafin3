// Basic Quiz answer table and rack rendering for blank keys (issue #812).
const { test } = require('node:test');
const assert = require('node:assert');
const { createWindow } = require('./support');

function blankWords(answers) {
  const words = {};
  answers.forEach(function (word) {
    words[word] = ['', '', '', [0, 0], ''];
  });
  return words;
}

test('answer table highlights the blank letter and keeps the ? hints', function () {
  const { w } = createWindow();
  try {
    const table = new w.QAnswers({ id: 'QAnswers', pare: 'root' });
    table.start({ words: blankWords(['ANTIAIR', 'DIARIAN']), alpha: 'AAIINR?' });

    assert.match(table.rows['ANTIAIR'].output.cells[2].innerHTML,
                 /AN<span class="blankLetter">T<\/span>IAIR/);
    assert.strictEqual(table.rows['ANTIAIR_H'].output.cells[2].textContent, '???????');
    assert.strictEqual(table.rows['DIARIAN_H'].output.cells[2].textContent, '???????');

    table.showHints();
    assert.strictEqual(table.rows['ANTIAIR_H'].output.cells[2].textContent, 'A??????');
    assert.strictEqual(table.rows['DIARIAN_H'].output.cells[2].textContent, 'D??????');

    table.showHints();
    assert.strictEqual(table.rows['ANTIAIR_H'].output.cells[2].textContent, 'AN?????');
  } finally {
    w.close();
  }
});

test('a plain answer table is unchanged', function () {
  const { w } = createWindow();
  try {
    const table = new w.QAnswers({ id: 'QAnswers', pare: 'root' });
    table.start({ words: blankWords(['ANTIAIR']), alpha: 'AAIINRT' });
    assert.strictEqual(table.rows['ANTIAIR'].output.cells[2].innerHTML, 'ANTIAIR');
    table.showHints();
    assert.strictEqual(table.rows['ANTIAIR_H'].output.cells[2].textContent, 'A??????');
  } finally {
    w.close();
  }
});

test('the blank renders as a normal rack tile with ?', function () {
  const { w } = createWindow();
  try {
    const tiles = new w.AlphaDisplay({ display: 0, tilePrefix: 'qTile', maxTileSize: 40 });
    tiles.newAlpha('AAIINR?', 400, 0);
    const tileEls = w.$(tiles.output()).find('.noselect');
    assert.strictEqual(tileEls.length, 7, 'one tile per character');
    assert.strictEqual(w.$(tiles.output()).find('.tileBlank').length, 0, 'no special blank class');
    assert.strictEqual(tileEls.eq(6).text().trim(), '?', 'the ? tile shows ? and no point value');
  } finally {
    w.close();
  }
});

test('capital letters mode shows ? as a normal character', function () {
  const { w } = createWindow();
  try {
    const text = new w.AlphaDisplay({ display: 1, tilePrefix: 't' });
    text.newAlpha('AAIINR?', 400, 1);
    assert.match(text.output().innerHTML, /AAIINR\?/);
    assert.ok(text.output().innerHTML.indexOf('blankAlpha') === -1, 'no special styling');
  } finally {
    w.close();
  }
});
