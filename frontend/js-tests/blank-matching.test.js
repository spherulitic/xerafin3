// Pure matching helpers from util.general.js (issue #812).
const { test, after } = require('node:test');
const assert = require('node:assert');
const { createWindow } = require('./support');

const { w } = createWindow();
after(function () { w.close(); });

test('isBlankAlpha only accepts a trailing wildcard', function () {
  assert.strictEqual(w.isBlankAlpha('AAIINR?'), true);
  assert.strictEqual(w.isBlankAlpha('AAIINR'), false);
  assert.strictEqual(w.isBlankAlpha(undefined), false);
});

test('answerFitsAlpha accepts the core plus exactly one letter', function () {
  assert.strictEqual(w.answerFitsAlpha('ANTIAIR', 'AAIINR?'), true, 'extra letter mid-word');
  assert.strictEqual(w.answerFitsAlpha('DIARIAN', 'AAIINR?'), true, 'extra letter first');
  assert.strictEqual(w.answerFitsAlpha('AAIINRD', 'AAIINR?'), true, 'extra letter trailing');
  assert.strictEqual(w.answerFitsAlpha('AAIINR', 'AAIINR?'), false, 'core only');
  assert.strictEqual(w.answerFitsAlpha('AAIINRAA', 'AAIINR?'), false, 'two extra letters');
  assert.strictEqual(w.answerFitsAlpha('ANTIAI', 'AAIINR?'), false, 'too short');
  assert.strictEqual(w.answerFitsAlpha('ANTIAIRS', 'AAIINR?'), false, 'too long');
  assert.strictEqual(w.answerFitsAlpha('AAIINTT', 'AAIINR?'), false, 'two mismatches');
});

test('answerFitsAlpha keeps the plain alphagram rule', function () {
  assert.strictEqual(w.answerFitsAlpha('ANTIAIR', 'AAIINRT'), true);
  assert.strictEqual(w.answerFitsAlpha('DIARIAN', 'AAIINRT'), false);
});

test('blankExtraLetter reports the supplied letter', function () {
  assert.strictEqual(w.blankExtraLetter('ANTIAIR', 'AAIINR?'), 'T');
  assert.strictEqual(w.blankExtraLetter('DIARIAN', 'AAIINR?'), 'D');
  assert.strictEqual(w.blankExtraLetter('AAIINRD', 'AAIINR?'), 'D');
  assert.strictEqual(w.blankExtraLetter('AADIINR', 'AAIINR?'), 'D');
  assert.strictEqual(w.blankExtraLetter('AAIINRA', 'AAIINR?'), 'A');
  assert.strictEqual(w.blankExtraLetter('ANTIAIR', 'AAIINR'), null);
});

test('alphaSortVC keeps ? once and last in every mode', function () {
  assert.strictEqual(w.alphaSortVC('AAIINR?', 0), 'AAIINR?');
  assert.strictEqual(w.alphaSortVC('AAIINR?', 1), 'NRAAII?');
  assert.strictEqual(w.alphaSortVC('AAIINR', 0), 'AAIINR');
  assert.strictEqual(w.alphaSortVC('AAIINR', 1), 'NRAAII');
  ['AAIINR?', 'AAIINR'].forEach(function (alpha) {
    [0, 1].forEach(function (type) {
      const out = w.alphaSortVC(alpha, type);
      assert.strictEqual(out.length, alpha.length, `length preserved (${alpha}, ${type})`);
      assert.strictEqual((out.match(/\?/g) || []).length, (alpha.match(/\?/g) || []).length,
                         `wildcard count preserved (${alpha}, ${type})`);
    });
  });
});

test('highlightBlankLetter wraps the supplied letter in red', function () {
  assert.strictEqual(w.highlightBlankLetter('ANTIAIR', 'AAIINR?'),
                     'AN<span class="blankLetter">T</span>IAIR');
  assert.strictEqual(w.highlightBlankLetter('DIARIAN', 'AAIINR?'),
                     '<span class="blankLetter">D</span>IARIAN');
  assert.strictEqual(w.highlightBlankLetter('ANTIAIR', 'AAIINRT'), 'ANTIAIR');
});
