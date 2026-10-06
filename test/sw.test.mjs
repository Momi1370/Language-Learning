import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const root = new URL('../', import.meta.url);
const sw = await readFile(new URL('sw.js', root), 'utf8');
const shell = JSON.parse(sw.match(/const SHELL = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

test('every file in the offline list exists', async () => {
  for (const f of shell.filter((x) => x !== './')) await access(new URL(f, root));
});

test('every JS module is in the offline list', async () => {
  const js = (await readdir(new URL('js/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`);
  const ui = (await readdir(new URL('js/ui/', root))).filter((f) => f.endsWith('.js')).map((f) => `js/ui/${f}`);
  for (const f of [...js, ...ui]) assert.ok(shell.includes(f), `${f} is missing from SHELL in sw.js`);
});

test('every lesson file is in the offline list (the app must open offline after install)', async () => {
  const files = ['content/words.json'];
  for (const lang of ['nl', 'en']) {
    for (const f of await readdir(new URL(`content/${lang}/`, root))) if (/^week-\d\d\.json$/.test(f)) files.push(`content/${lang}/${f}`);
  }
  for (const f of files) assert.ok(shell.includes(f), `${f} is missing from SHELL in sw.js`);
});

// Run sw.js with fake service-worker globals and record what it asks the network for.
async function runWorker(event, request) {
  const listeners = {};
  const fetched = [];
  const cached = [];
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    location: { origin: 'https://example.org' },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const cache = { addAll: async (list) => { cached.push(...list); }, put: async () => {} };
  const caches = { open: async () => cache, keys: async () => [], match: async () => undefined };
  const fetch = async (input, init) => { fetched.push({ input, init }); return { ok: true, clone: () => ({}) }; };
  class Request { constructor(url, init) { this.url = url; this.cache = init?.cache; } }
  runInNewContext(sw, { self, caches, fetch, URL, Request, Response: { error: () => null } });
  const waits = [];
  if (event === 'fetch') listeners.fetch({ request, respondWith: (p) => waits.push(p) });
  else listeners.install({ waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return { fetched, cached };
}

// GitHub Pages lets browsers reuse a file for 10 minutes without asking; an update must not wait for that.
test('online, the app always checks the server for newer files', async () => {
  const { fetched } = await runWorker('fetch', { method: 'GET', url: 'https://example.org/js/app.js', mode: 'cors' });
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].input, 'https://example.org/js/app.js');
  assert.equal(fetched[0].init?.cache, 'no-cache');
});

test('installing the offline copy downloads fresh files, not old browser copies', async () => {
  const { cached } = await runWorker('install');
  assert.ok(cached.length > 10);
  assert.ok(cached.every((r) => r.cache === 'reload'), 'every offline file is fetched with cache: reload');
});
