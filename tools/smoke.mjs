// Opens every screen in headless Chrome (320 px wide) and checks it rendered without errors.
// Usage: npm run smoke   (starts its own server; needs Google Chrome, or set CHROME=/path/to/chrome)
import { launch, FAKE_MIC } from './browser.mjs';
import { serve } from './serve.mjs';

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
  // Week 2 is not written yet: its 404s are expected, and Today must say so.
  await check('tools/set-position.html?week=2&session=1&to=today', 'today', 'coming soon', ['week-02.json']);

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
  await b.waitFor(`/coming soon/.test(document.querySelector('main').innerText)`, 5000);
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
