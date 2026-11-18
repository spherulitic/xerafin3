// Playwright pass for the blank (?) quiz UI (issue #812) against a local dev
// stack. Covers Basic Quiz, display/sort modes, completion/reset, Invaders and
// the "no ? reaches the cardbox" network rules.
//
// Local-only: this is not wired into CI (that needs the whole stack). See
// README.md for the seeded quizzes and how to run it in a container.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require('playwright');

let creds = {};
const credentialsPath = process.env.E2E_CREDENTIALS || path.join(__dirname, 'credentials.json');
try {
  creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
} catch (e) {
  // Fall back to E2E_USERNAME / E2E_PASSWORD.
}

const USER = process.env.E2E_USERNAME || creds.username;
const PASS = process.env.E2E_PASSWORD || creds.password;
if (!USER || !PASS) {
  console.error('Missing credentials: set E2E_USERNAME/E2E_PASSWORD or write ' + credentialsPath);
  process.exit(1);
}

const APP = process.env.E2E_BASE_URL || 'https://localhost:7443/';
const shots = process.env.E2E_SHOTS || path.join(__dirname, 'shots');
const resultsPath = process.env.E2E_RESULTS || path.join(__dirname, 'results.json');
fs.mkdirSync(shots, { recursive: true });
const results = [];
const network = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail);
    return true;
  } catch (e) {
    record(name, false, (e.message || String(e)).split('\n')[0]);
    return false;
  }
}

async function ensureOverview(page) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username, #overviewUI', { timeout: 60000 });
  if (await page.locator('#username').count()) {
    await page.fill('#username', USER);
    await page.fill('#password', PASS);
    await page.click('#kc-login');
  }
  await page.waitForSelector('#overviewUI', { timeout: 90000 });
  await page.waitForTimeout(1500);
}

async function setPrefs(page, prefs) {
  await page.evaluate(function (p) {
    Object.keys(p).forEach(function (k) { localStorage.setItem(k, p[k]); });
  }, prefs);
  await ensureOverview(page);
}

async function startQuiz(page, quizId, action) {
  const row = page.locator(`[id$="list_quiz_${quizId}"]`).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  await row.click();
  if (action !== undefined && Number(action) !== 0) {
    // #overviewGo_action_list: 0 Basic Quiz, 1 Cardbox Invaders, 2 Wall of Words
    await page.click('#overviewGo_action_list');
    await page.waitForTimeout(250);
    await page.click(`#overviewGo_action_list_${action}`);
    await page.waitForTimeout(250);
  }
  await page.click('#overviewGo_GoButton');
}

async function waitBasicQuiz(page) {
  await page.waitForSelector('#QRackContainer', { timeout: 60000 });
  await page.waitForTimeout(1200);
}

function input(page) {
  return page.locator('#BQMainRegion input.quizAnswerBox');
}

async function answer(page, word) {
  await input(page).fill(word);
  await input(page).press('Enter');
  await page.waitForTimeout(250);
}

async function progress(page) {
  return (await page.locator('.quizAnswerNumber').first().innerText()).replace(/\s+/g, ' ').trim();
}

async function tileLetters(page) {
  return page.locator('#QRackContainer .quizAlpha > div').evaluateAll(function (els) {
    return els.map(function (el) { return el.firstElementChild.textContent.trim(); });
  });
}

async function tileStyles(page) {
  return page.locator('#QRackContainer .quizAlpha > div').evaluateAll(function (els) {
    return els.map(function (el) {
      const s = getComputedStyle(el);
      return [s.backgroundColor, s.color, s.boxShadow, s.borderRadius, s.fontSize,
              el.className, el.style.backgroundColor, el.style.color].join('|');
    });
  });
}

async function resetQuiz(page, quizId) {
  const row = page.locator(`[id$="list_quiz_${quizId}"]`).first();
  await row.waitFor({ state: 'visible', timeout: 30000 });
  // Accordion rows only render their action buttons when expanded.
  if (await page.locator(`[id$="_rAll_${quizId}"]:visible`).count() === 0) {
    await row.locator('button').first().click();
    await page.waitForTimeout(600);
  }
  const btn = page.locator(`[id$="_rAll_${quizId}"]:visible`).first();
  if (await btn.count() === 0) throw new Error('no visible Reset All button for ' + quizId);
  await btn.click();
  await page.waitForTimeout(2000);
}

(async function () {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1400, height: 1000 },
    acceptDownloads: false
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', function (e) {
    // Headless Chromium cannot decode the Invaders audio; that is not a UI error.
    if (e.message.indexOf('no supported source') === -1) pageErrors.push(e.message);
  });
  page.on('dialog', function (d) { d.accept().catch(function () {}); });
  context.on('request', function (r) {
    const u = r.url();
    if (u.indexOf('/submitQuestion') > -1 || u.indexOf('/getAuxInfo') > -1 ||
        u.indexOf('/addQuestionToCardbox') > -1 || u.indexOf('/addManyToCardbox') > -1 ||
        u.indexOf('/sloth') > -1) {
      network.push({ url: u.replace(APP, '/'), body: r.postData() || '' });
    }
  });

  try {
    await ensureOverview(page);
    await setPrefs(page, { gAlphaSortInput: '0', gAlphaDisplay: '0' });

    // ---- Basic Quiz on the single-question blank quiz ----
    await startQuiz(page, 990003, 0);
    await waitBasicQuiz(page);

    await check('Basic Quiz: one ? tile, no point value, same look as the others', async function () {
      const letters = await tileLetters(page);
      assert.deepStrictEqual(letters, ['A', 'A', 'I', 'I', 'N', 'R', '?'],
                             'tiles: ' + letters.join(''));
      const styles = await tileStyles(page);
      assert.ok(styles[6] === styles[0], 'blank tile style differs');
      return 'styles match';
    });

    await check('Basic Quiz: sloth is disabled for a blank question', async function () {
      const disabled = await page.locator('button[title="Try this word in Subword Sloth"]').isDisabled();
      assert.strictEqual(disabled, true);
    });

    await check('Basic Quiz: progress starts at 0/2', async function () {
      const p = await progress(page);
      assert.strictEqual(p, 'Answers: 0/2');
    });

    await check('Basic Quiz: a non-fitting word is a typo and does not move progress', async function () {
      await answer(page, 'ZZZZZZ');
      assert.strictEqual(await progress(page), 'Answers: 0/2');
      assert.strictEqual((await page.locator('#BQMainRegion .wordTableWrong').innerText()).trim(), '');
      assert.strictEqual(await input(page).inputValue(), '');
      assert.strictEqual(await page.locator('#BQMainRegion .blankLetter:visible').count(), 0);
    });

    await check('Basic Quiz: a fitting non-answer is wrong, not a typo', async function () {
      await answer(page, 'AAIINRQ');
      assert.strictEqual(await progress(page), 'Answers: 0/2');
      assert.match(await page.locator('#BQMainRegion .wordTableWrong').innerText(), /AAIINRQ/);
    });

    await check('Basic Quiz: correct answer advances progress and shows the red blank letter', async function () {
      await answer(page, 'ANTIAIR');
      assert.strictEqual(await progress(page), 'Answers: 1/2');
      assert.ok(await page.locator('#BQMainRegion .blankLetter').count() > 0, 'no blankLetter span');
      const color = await page.locator('#BQMainRegion .blankLetter').first()
        .evaluate(function (el) { return getComputedStyle(el).color; });
      assert.strictEqual(color, 'rgb(255, 0, 0)', 'span color ' + color);
      const table = await page.locator('#BQMainRegion').innerText();
      assert.match(table, /ANTIAIR/);
    });

    await check('Basic Quiz: retyping a found word is a duplicate', async function () {
      await answer(page, 'ANTIAIR');
      assert.strictEqual(await progress(page), 'Answers: 1/2');
    });

    await check('Basic Quiz: hints reveal a prefix of every answer with ? placeholders', async function () {
      await page.click('button[title="Get Hint"]');
      await page.waitForTimeout(600);
      const table = await page.locator('#BQMainRegion').innerText();
      assert.match(table, /D\?{6}/, 'remaining answer hint missing: ' + table.replace(/\s+/g, ' ').slice(0, 200));
    });

    await check('Basic Quiz: the last answer auto-submits and exposes Next', async function () {
      await answer(page, 'DIARIAN');
      await page.waitForSelector('.quizButtonNext:visible', { timeout: 15000 });
      const p = await progress(page);
      assert.match(p, /Answers: 2\/2/);
      assert.strictEqual(await page.locator('#pan_5').count(), 0, 'Alphagram Info opened for a blank');
      await page.screenshot({ path: shots + '/10-basic-quiz-solved.png', fullPage: true });
    });

    await check('Basic Quiz: completing the only question reaches quiz complete', async function () {
      await page.click('.quizButtonNext');
      await page.waitForTimeout(3000);
      const status = await page.locator('#QStatusRegion').innerText();
      assert.match(status, /Quiz Complete/i, 'status: ' + status);
      await page.screenshot({ path: shots + '/11-basic-quiz-complete.png', fullPage: true });
    });

    await check('Overview: Reset All returns the blank quiz to unattempted', async function () {
      await ensureOverview(page);
      await resetQuiz(page, 990003);
      await ensureOverview(page);
      const row = page.locator('#overviewListGroup_activeList [id$="list_quiz_990003"]').first();
      await row.waitFor({ state: 'visible', timeout: 30000 });
      const text = await row.innerText();
      assert.match(text, /Progress:\s*0\/1/, 'row after reset: ' + text.replace(/\s+/g, ' '));
      assert.strictEqual(await page.locator('#overviewListGroup_completedList [id$="list_quiz_990003"]').count(), 0,
                         'quiz still listed as completed');
    });

    // ---- Display and sort modes (8-letter quiz) ----
    await check('Display: vowels-first capital letters shows one ? and no special styling', async function () {
      await setPrefs(page, { gAlphaSortInput: '1', gAlphaDisplay: '1' });
      await startQuiz(page, 990002, 0);
      await waitBasicQuiz(page);
      const text = (await page.locator('#QRackContainer .quizAlpha').innerText()).replace(/\s+/g, '');
      assert.strictEqual(text.length, 8, 'rack text: ' + text);
      assert.strictEqual((text.match(/\?/g) || []).length, 1, 'rack text: ' + text);
      assert.ok(text.indexOf('blankAlpha') === -1);
      const vowels = text.slice(0, -1); // trailing ? stays last
      assert.match(vowels, /^[AEIOU]+[BCDFGHJKLMNPQRSTVWXYZ]+$/, 'not vowels-first: ' + text);
      await page.screenshot({ path: shots + '/12-capital-vowels-first.png', fullPage: true });
    });

    await check('Display: consonants-first tiles still produce one ? tile', async function () {
      await setPrefs(page, { gAlphaSortInput: '2', gAlphaDisplay: '0' });
      await startQuiz(page, 990002, 0);
      await waitBasicQuiz(page);
      const letters = await tileLetters(page);
      assert.strictEqual(letters.length, 8);
      assert.strictEqual(letters.filter(function (l) { return l === '?'; }).length, 1);
      const styles = await tileStyles(page);
      assert.ok(styles[letters.indexOf('?')] === styles[0], 'blank tile style differs');
      await page.screenshot({ path: shots + '/13-tiles-consonants-first.png', fullPage: true });
    });

    await check('Display: shuffle and revert keep eight tiles with one ?', async function () {
      const before = await tileLetters(page);
      await page.click('button[title="Shuffle tiles randomly"]');
      await page.waitForTimeout(600);
      const shuffled = await tileLetters(page);
      assert.strictEqual(shuffled.length, 8);
      assert.strictEqual(shuffled.filter(function (l) { return l === '?'; }).length, 1);
      assert.deepStrictEqual(shuffled.slice().sort(), before.slice().sort());
      await page.click('button[title="Revert Tiles"]');
      await page.waitForTimeout(600);
      assert.deepStrictEqual(await tileLetters(page), before);
    });

    // ---- Invaders on the single blank question ----
    await check('Invaders: a blank question resolves, shows wrong guesses, and solves', async function () {
      await setPrefs(page, { gAlphaSortInput: '0', gAlphaDisplay: '0' });
      await ensureOverview(page);
      await startQuiz(page, 990004, 2);
      await page.waitForSelector('#invadersCanvas', { timeout: 60000 });
      // Invaders opens on its prescreen. Wait for the game object, then start it
      // (Enter in the answer box) and poll until the question is on the board.
      await page.waitForFunction(function () {
        return typeof invader !== 'undefined' && invader.invaderStatus !== undefined;
      }, null, { timeout: 60000 });
      await page.waitForTimeout(800);
      let pressed = 0;
      for (let i = 0; i < 12; i++) {
        if (await page.locator('[id="invWordsAAIINR?"]').count()) break;
        if (await page.evaluate(function () { return invader.invaderStatus === 'finished'; })) {
          await page.locator('#answerBox').press('Enter');
          pressed++;
        }
        await page.waitForTimeout(1000);
      }
      if (await page.locator('[id="invWordsAAIINR?"]').count() === 0) {
        const st = await page.evaluate(function () {
          try {
            return { status: invader.invaderStatus, questions: invader.q && invader.q.questions.length,
                     initialized: invader.q && invader.q.initialized, loading: invader.gettingWord,
                     noMoreWords: invader.noMoreWords, eof: invader.q && invader.q.eof,
                     httpError: invader.q && invader.q.hasHTTPError, alphas: invader.invadersAlphas.length };
          } catch (e) { return 'err ' + e.message; }
        });
        throw new Error('question never loaded: ' + JSON.stringify({ pressed: pressed, state: st }));
      }
      await page.waitForTimeout(800);

      const box = page.locator('#answerBox');
      await box.fill('AAIINRQ');
      await box.press('Enter');
      await page.waitForTimeout(400);
      assert.match(await page.locator('[id="invWordsWrongAAIINR?"]').innerText(), /AAIINRQ/,
                   'wrong word did not land on the blank row');

      await box.fill('ANTIAIR');
      await box.press('Enter');
      await page.waitForTimeout(400);
      assert.match(await page.locator('[id="invWordsAAIINR?"]').innerText(), /ANTIAIR/);

      await box.fill('DIARIAN');
      await box.press('Enter');
      await page.waitForTimeout(800);
      assert.strictEqual(await page.locator('[id="invAlphaDivAAIINR?"]').evaluate(function (el) {
        return el.parentNode.id;
      }), 'invSolvedDiv');
      await page.screenshot({ path: shots + '/14-invaders-solved.png', fullPage: true });
    });

    // ---- Network rules ----
    await check('Network: no ? key reached the cardbox, sloth, or alpha stats', async function () {
      const isApi = function (r) {
        return r.url.indexOf('/images/') === -1 && r.url.indexOf('/styles/') === -1 &&
               r.url.indexOf('/js/') === -1 && r.url.indexOf('/audio/') === -1;
      };
      const leaked = network.filter(function (r) {
        return isApi(r) && r.url.indexOf('/submitQuestion') === -1 &&
               (r.body.indexOf('AAIINR?') > -1 || r.body.indexOf('AAIINR%3F') > -1);
      });
      assert.deepStrictEqual(leaked, [], 'a ? key left the quiz submit path');
      assert.deepStrictEqual(network.filter(function (r) { return r.url.indexOf('/addQuestionToCardbox') > -1; }), []);
      assert.deepStrictEqual(network.filter(function (r) { return r.url.indexOf('/addManyToCardbox') > -1; }), []);
      const badAux = network.filter(function (r) {
        return r.url.indexOf('/getAuxInfo') > -1 && (r.body.indexOf('AAIINR?') > -1 || r.body.indexOf('AAIINR%3F') > -1);
      });
      assert.deepStrictEqual(badAux, [], 'cardbox getAuxInfo with ?');
      const blankSubmits = network.filter(function (r) {
        return r.url.indexOf('/submitQuestion') > -1 && r.body.indexOf('AAIINR?') > -1;
      });
      assert.ok(blankSubmits.length >= 1, 'expected a blank submit, got ' + blankSubmits.length);
      return blankSubmits.length + ' blank submit(s), no ? leaked to cardbox/sloth/alpha-stats';
    });

    await check('No JavaScript errors during the run', async function () {
      assert.deepStrictEqual(pageErrors, []);
    });
  } catch (e) {
    record('FATAL', false, e.message);
  } finally {
    fs.writeFileSync(resultsPath, JSON.stringify({ results, network, pageErrors }, null, 2));
    console.log('\n---- summary ----');
    results.forEach(function (r) { console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`); });
    const failed = results.filter(function (r) { return !r.ok; }).length;
    console.log(`${results.length - failed}/${results.length} checks passed`);
    await browser.close();
    process.exit(failed ? 1 : 0);
  }
})();
