// Loads the real frontend scripts into a jsdom window and provides the small
// set of helpers the tests need. No test-only logic lives in the app files.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML = path.join(__dirname, '..', 'html');
const JS = path.join(HTML, 'js');
const JQUERY = path.join(HTML, 'vendor', 'jQuery', 'jquery-3.3.1.min.js');

// gCreateElemArray lives in xerafinLayout.js, which pulls in half the app.
// It is small, and the tests only need the DOM-building part of it.
const CREATE_ELEM_ARRAY = `
function gCreateElemArray(par){
    for (var x=0;x<par.length;x++){
        eval("var "+par[x][0]+"= document.createElement('"+par[x][1]+"')");
        eval(par[x][0]+".className = ' '+par[x][2]");
        eval(par[x][0]+".id = '"+par[x][3]+"'");
        eval(par[x][0]+".innerHTML= '"+par[x][5]+"'");
        eval(par[x][4]+".appendChild("+par[x][0]+")");
    }
}
`;

function createWindow() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only' }
  );
  const w = dom.window;

  const load = (code, label) => {
    try {
      w.eval(code);
    } catch (e) {
      throw new Error(`failed to load ${label}: ${e.message}`, { cause: e });
    }
  };

  load(fs.readFileSync(JQUERY, 'utf8'), 'jQuery');
  // jQuery UI is a separate CDN script in the browser; stub the plugins the
  // quiz UI calls so the scripts can build their DOM.
  load(
    'window.$ = window.jQuery = jQuery;' +
    '$.fn.tab = function(){ return this; };' +
    '$.fn.sortable = function(){ return this; };' +
    '$.fn.disableSelection = function(){ return this; };',
    'jQuery stubs'
  );

  load(fs.readFileSync(path.join(JS, 'util.general.js'), 'utf8'), 'util.general.js');
  // Class declarations are lexical, so re-export them onto the window for the
  // Node-side test code to construct.
  load(fs.readFileSync(path.join(JS, 'quiz.js'), 'utf8') +
       '\nwindow.Question = Question; window.Quiz = Quiz;', 'quiz.js');
  load(fs.readFileSync(path.join(JS, 'frag.tile.js'), 'utf8') +
       '\nwindow.Tile = Tile;', 'frag.tile.js');
  load(fs.readFileSync(path.join(JS, 'frag.alphaDisplay.js'), 'utf8') +
       '\nwindow.AlphaDisplay = AlphaDisplay;', 'frag.alphaDisplay.js');
  load(fs.readFileSync(path.join(JS, 'frag.qAnswers.js'), 'utf8') +
       '\nwindow.QAnswers = QAnswers;', 'frag.qAnswers.js');
  load(fs.readFileSync(path.join(JS, 'frag.answerArea.js'), 'utf8') +
       '\nwindow.AnswerArea = AnswerArea;', 'frag.answerArea.js');
  load(fs.readFileSync(path.join(JS, 'frag.slothTable.js'), 'utf8') +
       '\nwindow.SlothTable = SlothTable;', 'frag.slothTable.js');
  load(fs.readFileSync(path.join(JS, 'frag.slothBoard.js'), 'utf8') +
       '\nwindow.SlothBoard = SlothBoard;', 'frag.slothBoard.js');
  load(fs.readFileSync(path.join(JS, 'app.sloth.js'), 'utf8') +
       '\nwindow.SlothQuiz = SlothQuiz; window.SlothQuestion = SlothQuestion;', 'app.sloth.js');
  load(CREATE_ELEM_ARRAY, 'gCreateElemArray');

  return { dom, w };
}

// Minimal harness for panels.js: three empty column containers, jQuery, and the
// few globals the file touches outside the panel-layout helpers.
function createPanelsWindow() {
  const dom = new JSDOM(
    '<!doctype html><html><body>' +
      '<div id="leftArea"></div><div id="middleArea"></div><div id="rightArea"></div>' +
      '</body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only' }
  );
  const w = dom.window;

  const load = (code, label) => {
    try {
      w.eval(code);
    } catch (e) {
      throw new Error(`failed to load ${label}: ${e.message}`, { cause: e });
    }
  };

  load(fs.readFileSync(JQUERY, 'utf8'), 'jQuery');
  load(
    'window.$ = window.jQuery = jQuery;' +
    'function appendDebugLog(){}' +
    'function isMobile(){ return false; }' +
    'function startChat(){}' +
    'var xerafin = { error: { log: { add: function(){} } } };',
    'panels.js stubs'
  );
  load(fs.readFileSync(path.join(JS, 'panels.js'), 'utf8'), 'panels.js');

  return { dom, w };
}

// A question object shaped like the /getQuestions response. submitQuestion is
// replaced so tests never make network calls.
function makeQuestion(w, alpha, answers) {
  const words = {};
  answers.forEach(function (word) {
    // [front hooks, back hooks, definition, [front dot, back dot], symbols]
    words[word] = ['', '', '', [0, 0], ''];
  });
  const q = new w.Question({
    alpha: alpha,
    answers: answers.slice(),
    words: words,
    cardbox: null,
    cardboxEligible: false,
    correct: 0,
    incorrect: 0,
    nextScheduled: null
  }, true, 42);
  q.submittedAnswers = [];
  q.submitQuestion = function (correct) {
    this.submitted = true;
    this.submittedAnswers.push(correct);
  };
  return q;
}

// The Invaders / Wall of Words answer area needs the tab panes addDOM builds.
// Browsers expose elements by id as window globals; jsdom does not, and
// gCreateElemArray relies on that for the pane names.
function makeAnswerArea(w, question) {
  const host = {
    questions: [question],
    getQuestionByAlpha: w.Quiz.prototype.getQuestionByAlpha,
    getQuestionByAnswer: w.Quiz.prototype.getQuestionByAnswer
  };
  const area = new w.AnswerArea({ q: host });
  const parent = w.document.createElement('div');
  w.document.body.appendChild(parent);
  w.__answerAreaParent = parent;
  w.eval('var testParent = window.__answerAreaParent;');
  area.addDOM('testParent');
  ['invCurDiv', 'invSolvedDiv', 'invMissedDiv'].forEach(function (id) {
    w[id] = w.document.getElementById(id);
  });
  area.setupWord(question);
  return area;
}

function typeAnswer(w, area, word) {
  w.$('#answerBox').val(word);
  return area.submitAnswer();
}

module.exports = { createWindow, createPanelsWindow, makeQuestion, makeAnswerArea, typeAnswer };
