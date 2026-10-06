// Opens every screen in headless Chrome (320 px wide) and checks it rendered without errors.
// Usage: npm run smoke   (starts its own server; needs Google Chrome, or set CHROME=/path/to/chrome)
import { launch, FAKE_MIC } from './browser.mjs';
import { serve } from './serve.mjs';
import { readdir } from 'node:fs/promises';

// The weeks that exist now; the first missing one must say "coming soon".
const written = (await readdir(new URL('../content/nl/', import.meta.url)))
  .filter((f) => /^week-\d\d\.json$/.test(f)).map((f) => Number(f.slice(5, 7))).sort((a, b) => a - b);
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
  const routes = ['today', 'block/cards', 'block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english', 'roleplay', 'progress', 'settings'];
  for (const r of routes) await check(`index.html#/${r}`, r);
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
  await b.waitFor(`/coming soon|Week 2 · Session 1/.test(document.querySelector('main').innerText)`, 5000);
  const after = await b.evaluate(`(() => { const s = JSON.parse(localStorage.getItem('taalmaatje.v1')); return s.position.week + '-' + s.position.session + ' history ' + s.history.length; })()`);
  const once = after === '2-1 history 1';
  if (!once) failed++;
  console.log(`${once ? '✓' : '✗'} double tap on Finish moves on once (${after})`);
} finally {
  await b.close();
  server.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll screens OK');
process.exit(failed ? 1 : 0);
