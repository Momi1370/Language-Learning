// Opens every screen in headless Chrome (320 px wide) and checks it rendered without errors.
// Usage: npm run smoke   (starts its own server; needs Google Chrome, or set CHROME=/path/to/chrome)
import { launch } from './browser.mjs';
import { serve } from './serve.mjs';

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}`;
const b = await launch();
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
} finally {
  await b.close();
  server.close();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll screens OK');
process.exit(failed ? 1 : 0);
