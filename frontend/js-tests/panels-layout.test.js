// Panel layout persistence (issues #373 and #589).
const { test, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { createPanelsWindow } = require('./support');

const { w } = createPanelsWindow();
after(function () { w.close(); });
beforeEach(function () {
  ['leftArea', 'middleArea', 'rightArea'].forEach(function (id) {
    w.document.getElementById(id).innerHTML = '';
  });
});

// jsdom arrays use the window's Array prototype, which breaks
// deepStrictEqual's prototype check. Round-trip through this realm's JSON.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function layout() {
  return plain(w.getPanelLayout());
}

function setLayout(value) {
  w.localStorage.setItem('panelPositions', JSON.stringify(value));
}

function panelNode(id, minimized) {
  const node = w.document.createElement('div');
  node.id = id;
  if (minimized) {
    const button = w.document.createElement('button');
    button.id = 'minim_button_' + id;
    const span = w.document.createElement('span');
    span.className = 'glyphicon-chevron-down';
    button.appendChild(span);
    node.appendChild(button);
  }
  return node;
}

test('new users get the basic quiz, not sloth (#373)', function () {
  w.localStorage.removeItem('panelPositions');
  w.loadPanelLayout();
  const cols = layout();
  assert.deepStrictEqual(cols[0], [['4', true], ['1_a', false]]);
  assert.strictEqual(cols[0].some(function (entry) { return entry[0] === '1_b'; }), false);
  assert.deepStrictEqual(cols[1], [['0', false]]);
  assert.deepStrictEqual(cols[2], [['2', false], ['3', false]]);
});

test('addPanel honours the requested index', function () {
  setLayout([[['4', false]], [], []]);
  w.addPanel('5', 'leftArea', 1);
  assert.deepStrictEqual(layout()[0], [['4', false], ['5', false]]);
  w.addPanel('6', 'leftArea', 0);
  assert.deepStrictEqual(layout()[0], [['6', false], ['4', false], ['5', false]]);
  w.addPanel('7', 'leftArea', -1);
  assert.deepStrictEqual(layout()[0].map(function (entry) { return entry[0]; }),
                         ['6', '4', '5', '7']);
});

test('replacing a game panel keeps its slot', function () {
  setLayout([[['4', true], ['1_b', false]], [['0', false]], []]);
  const slot = plain(w.findGamePanelSlot('1'));
  assert.deepStrictEqual(slot, [0, 1]);

  // generatePanel() drops the outgoing game panel from both storage and DOM
  // before inserting the new one.
  const cols = w.getPanelLayout();
  w.removeGamePanels(cols, '1');
  w.savePanelLayout(cols);
  const left = w.document.getElementById('leftArea');
  left.innerHTML = '';
  left.appendChild(panelNode('pan_4'));

  w.insertPanelAt('1_a', slot, panelNode('pan_1_a'));

  assert.deepStrictEqual(layout()[0], [['4', true], ['1_a', false]]);
  assert.deepStrictEqual(Array.from(left.children).map(function (node) { return node.id; }),
                         ['pan_4', 'pan_1_a']);
});

test('a layout without the overview is repaired, not wiped (#589)', function () {
  setLayout([[['4', true], ['1_a', false]], [['3', false]], [['2', false]]]);
  w.loadPanelLayout();
  const cols = layout();
  assert.deepStrictEqual(cols[0], [['4', true], ['1_a', false]]);
  assert.deepStrictEqual(cols[1][0], ['0', false]);
  assert.strictEqual(cols[1].some(function (entry) { return entry[0] === '3'; }), true);
  assert.deepStrictEqual(cols[2], [['2', false]]);
});

test('unparseable layouts fall back to the default', function () {
  w.localStorage.setItem('panelPositions', 'not json');
  w.loadPanelLayout();
  assert.deepStrictEqual(layout(), plain(w.defaultPanelLayout()));
});

test('drag-save ignores placeholders and preserves unloaded panels', function () {
  setLayout([[['4', true], ['1_a', false], ['5', false]], [['0', false]], []]);
  const left = w.document.getElementById('leftArea');
  left.innerHTML = '';
  left.appendChild(panelNode('pan_4', true));
  left.appendChild(panelNode('pan_1_a'));
  const placeholder = w.document.createElement('br');
  placeholder.id = 'leftArea_temp_9';
  left.appendChild(placeholder);

  w.writePanelStatus([
    ['pan_4', 'pan_1_a', 'leftArea_temp_9'],
    ['pan_0'],
    []
  ]);

  assert.deepStrictEqual(layout()[0], [['4', true], ['1_a', false], ['5', false]]);
  assert.deepStrictEqual(layout()[1], [['0', false]]);
});

test('dragging a panel to another column keeps it there', function () {
  setLayout([[['4', false], ['1_a', false]], [['0', false]], []]);
  w.writePanelStatus([
    ['pan_4'],
    ['pan_0', 'pan_1_a'],
    []
  ]);
  assert.deepStrictEqual(layout()[0], [['4', false]]);
  assert.deepStrictEqual(layout()[1], [['0', false], ['1_a', false]]);
});

test('duplicate and legacy panel ids are normalised', function () {
  assert.strictEqual(w.normalizePanelId('pan_20'), '1_a');
  assert.strictEqual(w.normalizePanelId('1_e'), '1_a');
  assert.strictEqual(w.normalizePanelId('pan_1_b'), '1_b');

  setLayout([[['4', false]], [['0', false], ['4', true], ['20', false]], []]);
  const cols = layout();
  assert.deepStrictEqual(cols[0], [['4', false]]);
  assert.deepStrictEqual(cols[1], [['0', false], ['1_a', false]]);
  assert.deepStrictEqual(cols[2], []);
});
