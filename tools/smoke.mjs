// Opens every screen in headless Chrome (320 px wide) and checks it rendered without errors.
// Usage: npm run smoke   (starts its own server; needs Google Chrome, or set CHROME=/path/to/chrome)
import { launch, FAKE_MIC } from './browser.mjs';
import { serve } from './serve.mjs';
import { readdir } from 'node:fs/promises';

// The weeks that exist now; the first missing one must say "coming soon".
const written = (await readdir(new URL('../content/nl/', import.meta.url)))
  .filter((f) => /^week-\d\d\.json$/.test(f)).map((f) => Number(f.slice(5, 7))).sort((a, b) => a - b);
// The Words tab probes for pack-NN.json until one is missing; that one 404 is expected.
const vocabCount = (await readdir(new URL('../content/vocab/', import.meta.url))).filter((f) => /^pack-\d\d\.json$/.test(f)).length;
const noPack = [`pack-${String(vocabCount + 1).padStart(2, '0')}.json`];

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}`;
const b = await launch({ args: FAKE_MIC });
let failed = 0;

async function check(path, route, expectText, allowedErrors = []) {
  const before = b.errors.length;
  await b.evaluate('delete document.body?.dataset.ready').catch(() => {});
  await b.goto(`${base}/${path}`);
  const problems = [];
  if (!(await b.waitFor(`document.body.dataset.ready === ${JSON.stringify(route)}`, 15000))) problems.push('screen did not finish rendering');
  const text = await b.text().catch(() => '');
  if (text.includes('Something went wrong on this screen')) problems.push('screen showed the error panel');
  if (expectText && !text.includes(expectText)) problems.push(`missing text "${expectText}"`);
  problems.push(...b.errors.slice(before).filter((e) => !allowedErrors.some((a) => e.includes(a))));
  if (problems.length) failed++;
  console.log(`${problems.length ? '✗' : '✓'} /${path}${problems.map((p) => `\n   - ${p}`).join('')}`);
}

try {
  const routes = ['today', 'block/cards', 'block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english', 'roleplay', 'progress', 'settings', 'words', 'words/list'];
  for (const r of routes) await check(`index.html#/${r}`, r, null, r.startsWith('words') ? noPack : []);
  await check('tools/set-position.html?week=1&session=5&to=block/listen', 'block/listen', 'Limburg ear');
  await check('tools/set-position.html?week=1&session=5&to=block/speak', 'block/speak', 'Speaking diary');
  await check('tools/set-position.html?week=1&session=5&to=roleplay', 'roleplay', 'Copy prompt');
  // Every written week opens (session 1) and has its Limburg ear (session 5).
  for (const w of written) {
    await check(`tools/set-position.html?week=${w}&session=1&to=today`, 'today', `Week ${w} · Session 1`);
    await check(`tools/set-position.html?week=${w}&session=5&to=block/listen`, 'block/listen', 'Limburg ear');
  }
  // The first week that is not written yet: its 404s are expected, and Today must say so.
  const next = written.at(-1) + 1;
  if (next <= 12) {
    const file = `week-${String(next).padStart(2, '0')}.json`;
    await check(`tools/set-position.html?week=${next}&session=1&to=today`, 'today', 'coming soon', [file]);
  }

  // Lessons fail to load (offline, server error): Today explains, other screens keep working.
  await b.block(['*content/*week-*.json*']);
  const blocked = ['ERR_BLOCKED_BY_CLIENT', 'week-0'];
  await check('tools/set-position.html?week=1&session=1&to=today', 'today', 'Could not load the lessons', blocked);
  await check('index.html#/block/cards', 'block/cards', 'Cards', blocked);
  await check('index.html#/progress', 'progress', 'Progress', blocked);
  await check('index.html#/settings', 'settings', 'Backup', blocked);
  await b.block([]);

  // 🎯 Say it keeps listening when the learner pauses mid-sentence, and finishes by itself once every
  // word was heard. The fake recognizer acts like browsers: unless continuous, it ends at the first pause.
  await check('tools/set-position.html?week=1&session=1&to=block/cards', 'block/cards', 'Got it');
  await b.evaluate(`(() => {
    const Fake = class {
      start() {
        const words = document.querySelector('.card .speakable').textContent.replace(/…/g, ' ').trim().split(/\\s+/);
        const half = Math.ceil(words.length / 2);
        this.results = [];
        [words.slice(0, half).join(' '), words.slice(half).join(' ')].forEach((part, i) => setTimeout(() => this.hear(part), 200 + i * 500));
      }
      hear(text) {
        if (this.ended) return;
        this.results.push(Object.assign([{ transcript: text }], { isFinal: true }));
        this.onresult?.({ resultIndex: this.results.length - 1, results: this.results });
        if (!this.continuous) this.end();
      }
      stop() { setTimeout(() => this.end(), 10); }
      abort() { this.end(); }
      end() { if (!this.ended) { this.ended = true; this.onend?.(); } }
    };
    window.webkitSpeechRecognition = Fake;
    window.SpeechRecognition = Fake;
  })()`);
  await b.evaluate(`document.body.dataset.ready = ''; location.hash = '#/today'`);
  await b.waitFor(`document.body.dataset.ready === 'today'`, 5000);
  await b.evaluate(`location.hash = '#/block/cards'`);
  await b.waitFor(`document.body.dataset.ready === 'block/cards'`, 5000);
  await b.click('Say it');
  const whole = await b.waitFor(`/Understood ✓/.test(document.querySelector('.check-result')?.textContent ?? '')`, 5000);
  if (!whole) failed++;
  console.log(`${whole ? '✓' : '✗'} 🎯 Say it waits through a pause and hears the whole sentence`);
  if (!whole) console.log(`   - it showed: ${await b.evaluate(`document.querySelector('.check-result')?.textContent ?? '(nothing)'`)}`);

  // Words tab: today's batch is sorted by ticking the new words; "Teach me" makes a card; reopening keeps the batch.
  const vocabState = `(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); return s; })()`;
  await check('index.html#/words', 'words', 'new to you', noPack);
  const batch = await b.evaluate(`${vocabState}.vocab.day.ids.join()`);
  const boxes = await b.evaluate(`document.querySelectorAll('.sort-row input').length`);
  const switcher = await b.evaluate(`[...document.querySelectorAll('button[aria-pressed]')].map((x) => x.textContent).join('|')`);
  const sortOk = batch.split(',').length === 10 && boxes === 10 && /Everyday · \d+ new\|University · \d+ new/.test(switcher);
  if (!sortOk) failed++;
  console.log(`${sortOk ? '✓' : '✗'} Words tab shows 10 words to sort and the Everyday / University switch (${boxes} boxes; ${switcher})`);
  await b.evaluate(`document.querySelector('.sort-row input').click()`);
  const doneLabel = await b.evaluate(`document.querySelector('button.primary.wide').textContent`);
  await b.click('Done — teach me 1 word');
  const text = await b.text();
  const known = await b.evaluate(`${vocabState}.vocab.known.length`);
  const triageOk = doneLabel === 'Done — teach me 1 word' && known === 9 && /I know it/.test(text) && /Teach me/.test(text) && /\/.+\//.test(text);
  if (!triageOk) failed++;
  console.log(`${triageOk ? '✓' : '✗'} sorting marks the 9 unticked words known and leaves the ticked one with its IPA and the triage buttons (${known} known)`);
  await b.click('Teach me');
  const taught = await b.evaluate(`Object.keys(${vocabState}.cards).filter((id) => /^v-/.test(id)).join()`);
  const first = batch.split(',')[0];
  const cardOk = taught === first;
  if (!cardOk) failed++;
  console.log(`${cardOk ? '✓' : '✗'} "Teach me" makes a card for the ticked word (${taught})`);
  await check('index.html?again#/words', 'words', 'Today: 10 of 10 words done', noPack);
  const same = (await b.evaluate(`${vocabState}.vocab.day.ids.join()`)) === batch;
  if (!same) failed++;
  console.log(`${same ? '✓' : '✗'} reopening the Words tab keeps the same batch`);
  await check('index.html#/words/list', 'words/list', 'All words', noPack);

  // The words fail to load: the Words tab explains and offers "Try again"; other screens keep working.
  await b.block(['*content/vocab/*']);
  await check('index.html?blocked#/words', 'words', 'Could not load the words', ['ERR_BLOCKED_BY_CLIENT', 'pack-0']);
  await check('index.html#/progress', 'progress', 'Progress', ['ERR_BLOCKED_BY_CLIENT', 'pack-0']);
  await b.block([]);

  // Farsi hints off: the word page hides the Farsi note and translations but keeps the Farsi meaning.
  await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); s.settings.farsi = false; s.vocab.day.date = ''; localStorage.setItem('taalmaatje.v1', JSON.stringify(s)); })()`);
  await check('index.html?nofarsi#/words', 'words', 'new to you', noPack);
  await b.click('Go through them one by one instead');
  const farsiCount = await b.evaluate(`document.querySelectorAll('.card.vocab .fa').length`);
  const hintsOff = farsiCount === 1;
  if (!hintsOff) failed++;
  console.log(`${hintsOff ? '✓' : '✗'} with Farsi hints off the word page keeps only the Farsi meaning (${farsiCount} Farsi line)`);
  await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); s.settings.farsi = true; localStorage.setItem('taalmaatje.v1', JSON.stringify(s)); })()`);

  // Vocabulary in the Cards block: a new card shows the word page; reviews show the Farsi meaning and a gap.
  // A finished course adds no new course cards, and the earlier screens' course cards are removed,
  // so only vocabulary cards are due.
  await b.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('taalmaatje.v1'));
    s.finished = true;
    s.cards = Object.fromEntries(Object.entries(s.cards).filter(([id]) => /^v-/.test(id)));
    localStorage.setItem('taalmaatje.v1', JSON.stringify(s));
  })()`);
  await check('index.html?cards#/block/cards', 'block/cards', 'NEW · ENGLISH WORD', noPack);
  await b.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('taalmaatje.v1'));
    const template = s.cards[Object.keys(s.cards).find((id) => /^v-/.test(id))];
    for (let n = 1; n <= 12; n++) s.cards['v-' + String(n).padStart(4, '0')] = { ...template, due: '2020-01-01T00:00:00.000Z', reps: 3 };
    s.vocab.reviews = { key: '', count: 0 };
    localStorage.setItem('taalmaatje.v1', JSON.stringify(s));
  })()`);
  await check('index.html?cap#/block/cards', 'block/cards', '10 cards to review', noPack);
  const review = await b.text();
  const reviewOk = /say the english word/i.test(review) && /____/.test(review);
  if (!reviewOk) failed++;
  console.log(`${reviewOk ? '✓' : '✗'} a vocabulary review shows the Farsi meaning and the example with a gap`);
  await b.click('Show');
  await b.click('Good');
  const left = await b.waitFor(`/9 cards to review|say the english word/i.test(document.querySelector('main').innerText)`, 3000);
  const counted = await b.evaluate(`JSON.parse(localStorage.getItem('taalmaatje.v1')).vocab.reviews.count`);
  if (!left || counted !== 1) failed++;
  console.log(`${left && counted === 1 ? '✓' : '✗'} grading a vocabulary card counts one review toward the cap of 10 (${counted})`);
  await check('index.html#/settings', 'settings', 'New English words per day');
  await check('index.html#/progress', 'progress', '📚 Words:');

  // Leaving a line while recording must turn the microphone off.
  await check('tools/set-position.html?week=1&session=1&to=block/listen', 'block/listen', 'Line 1 of');
  await b.evaluate(`(() => {
    window.__streams = [];
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); window.__streams.push(s); return s; };
  })()`);
  await b.click('Record');
  await b.waitFor(`/Stop/.test(document.querySelector('.recorder button').textContent)`, 5000);
  await b.click('Next line');
  const live = await b.waitFor(`window.__streams.length > 0 && window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'))`, 3000);
  if (!live) failed++;
  console.log(`${live ? '✓' : '✗'} microphone is off after leaving a line while recording`);

  // iPhone sometimes never sends the recorder's stop event: Stop must still finish, free the mic and keep the take.
  await check('tools/set-position.html?week=1&session=1&to=block/listen', 'block/listen', 'Line 1 of');
  await b.evaluate(`(() => {
    window.__streams = [];
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); window.__streams.push(s); return s; };
    MediaRecorder.prototype.stop = function () {};
  })()`);
  await b.click('Record');
  await b.waitFor(`/Stop/.test(document.querySelector('.recorder button').textContent)`, 5000);
  await new Promise((r) => setTimeout(r, 1600));
  await b.click('Stop');
  const waiting = await b.evaluate(`(() => { const btn = document.querySelector('.recorder button'); return btn.disabled && /Stopping/.test(btn.textContent); })()`);
  if (!waiting) failed++;
  console.log(`${waiting ? '✓' : '✗'} while stopping, the button says so and ignores taps`);
  const stops = await b.waitFor(`(() => {
    const rec = document.querySelector('.recorder');
    return /Record again/.test(rec.querySelector('button').textContent) && rec.querySelector('audio').src.startsWith('blob:')
      && window.__streams.length > 0 && window.__streams.every((s) => s.getTracks().every((t) => t.readyState === 'ended'));
  })()`, 5000);
  if (!stops) failed++;
  console.log(`${stops ? '✓' : '✗'} Stop works even when the browser never sends the stop event (iPhone)`);

  // If the browser delivered no sound at all, say so instead of showing an empty player.
  await check('tools/set-position.html?week=1&session=1&to=block/listen', 'block/listen', 'Line 1 of');
  await b.evaluate(`(() => { MediaRecorder.prototype.stop = function () {}; MediaRecorder.prototype.requestData = function () {}; Object.defineProperty(MediaRecorder.prototype, 'ondataavailable', { set() {}, configurable: true }); })()`);
  await b.click('Record');
  await b.waitFor(`/Stop/.test(document.querySelector('.recorder button').textContent)`, 5000);
  await b.click('Stop');
  const empty = await b.waitFor(`(() => {
    const rec = document.querySelector('.recorder');
    return /Nothing was recorded/.test(rec.textContent) && rec.querySelector('audio').hidden && /Record/.test(rec.querySelector('button').textContent);
  })()`, 5000);
  if (!empty) failed++;
  console.log(`${empty ? '✓' : '✗'} an empty recording says "Nothing was recorded" instead of showing a silent player`);

  // Settings → Audio check reports voices, a speech test and a recording test, ready to copy.
  await check('index.html?audio#/settings', 'settings', 'Audio check');
  await b.click('Audio check');
  const report = '[...document.querySelectorAll(".audio-check pre")].map((p) => p.textContent).join("\\n")';
  const lists = await b.waitFor(`/Dutch voices: .*Ellen|Dutch voices: \\d/.test(${report}) && /App uses for Dutch: /.test(${report})`, 3000);
  await b.click('like the app');
  const spoke = await b.waitFor(`/Test 1: .*(finished|error|no end)/.test(${report})`, 8000);
  await b.click('Test recording');
  const recorded = await b.waitFor(`/Recording: .*bytes/.test(${report}) && /Playback: /.test(${report})`, 10000);
  await b.click('Test 4');
  const t4 = await b.waitFor(`/Test 4: .*(finished|error|no end|no audioSession)/.test(${report})`, 8000);
  await b.click('Test 5');
  const t5 = await b.waitFor(`/Test 5: silent sound /.test(${report}) && /Test 5: .*(finished|error|no end)/.test(${report})`, 8000);
  const audioOk = lists && spoke && recorded && t4 && t5;
  if (!audioOk) failed++;
  console.log(`${audioOk ? '✓' : '✗'} Audio check lists voices and reports speech and recording tests`);
  if (!audioOk) console.log((await b.evaluate(report).catch(() => '')).replace(/^/gm, '   '));

  // A double tap on "Finish session" at the end of a week must move on exactly once.
  await check('tools/set-position.html?week=1&session=5&to=today', 'today', 'Week 1 · Session 5');
  await b.evaluate(`(() => {
    const s = JSON.parse(localStorage.getItem('taalmaatje.v1'));
    s.done = ['cards', 'sound', 'listen', 'speak', 'grammar', 'english'];
    s.history = [];
    localStorage.setItem('taalmaatje.v1', JSON.stringify(s));
  })()`);
  await check('index.html?again#/today', 'today', 'Finish session ✓');
  await b.evaluate(`(() => { const btn = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Finish session')); btn.click(); btn.click(); })()`);
  // Finishing week 1 must land on week 2 when it exists, otherwise on "coming soon".
  const expectNext = written.includes(2) ? 'Week 2 · Session 1' : 'coming soon';
  const landed = await b.waitFor(`document.querySelector('main').innerText.includes(${JSON.stringify(expectNext)})`, 5000);
  const after = await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); return s.position.week + '-' + s.position.session + ' history ' + s.history.length; })()`);
  const once = landed && after === '2-1 history 1';
  if (!once) failed++;
  console.log(`${once ? '✓' : '✗'} double tap on Finish moves on once and lands on "${expectNext}" (${after})`);
} finally {
  await b.close();
  server.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll screens OK');
process.exit(failed ? 1 : 0);
