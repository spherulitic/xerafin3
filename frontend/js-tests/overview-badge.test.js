// Overview type badges for blank daily quizzes (issue #810).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { createWindow } = require('./support');

const OVERVIEW_ROW = path.join(__dirname, '..', 'html', 'js', 'frag.overviewRow.js');

function loadOverviewRow(w) {
  w.eval(fs.readFileSync(OVERVIEW_ROW, 'utf8') +
         '\nwindow.OverviewRow = OverviewRow;');
}

function badge(w, name) {
  const row = Object.create(w.OverviewRow.prototype);
  row.data = { quizname: name, quizid: 1 };
  return row.drawTypeIndicator();
}

test('blank daily quizzes get the B badge', function () {
  const { w } = createWindow();
  try {
    loadOverviewRow(w);
    const el = badge(w, 'Daily Blank 7s 20 Nov 2026');
    assert.strictEqual(el.innerHTML, 'B');
    assert.match(el.className, /overviewTypeIndicator/);
    assert.match(el.className, /burntOrangeRowed/);
    assert.strictEqual(el.title, 'Blank Quiz');
  } finally {
    w.close();
  }
});

test('ordinary daily quizzes keep the D badge', function () {
  const { w } = createWindow();
  try {
    loadOverviewRow(w);
    const el = badge(w, 'Daily 7s 20 Nov 2026');
    assert.strictEqual(el.innerHTML, 'D');
    assert.match(el.className, /silverRowed/);
    assert.strictEqual(el.title, 'Daily Quiz');
  } finally {
    w.close();
  }
});
