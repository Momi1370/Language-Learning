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
  for (const f of await readdir(new URL('content/vocab/', root))) if (/^pack-\d\d\.json$/.test(f)) files.push(`content/vocab/${f}`);
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

// Recorded voice clips: an iPhone plays media through the worker only if byte-range requests are answered with 206.
async function audioRequest(headers) {
  const listeners = {};
  const stored = new Map();
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).buffer;
  const self = { addEventListener: (type, fn) => { listeners[type] = fn; }, location: { origin: 'https://example.org' }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const cache = { addAll: async () => {}, put: async (k, v) => { stored.set(typeof k === 'string' ? k : k.url, v); }, match: async (k) => stored.get(typeof k === 'string' ? k : k.url) };
  const caches = { open: async () => cache, keys: async () => [], match: async (k) => stored.get(typeof k === 'string' ? k : k.url) };
  let network = 0;
  const fetch = async () => { network++; return { ok: true, status: 200, arrayBuffer: async () => bytes, clone() { return this; }, headers: new Map() }; };
  class FakeResponse { constructor(body, init) { this.body = body; this.status = init?.status ?? 200; this.headers = init?.headers ?? {}; this.ok = this.status < 300; } static error() { return null; } }
  runInNewContext(sw, { self, caches, fetch, URL, Request: class { constructor(u) { this.url = u; } }, Response: FakeResponse });
  const req = { method: 'GET', url: 'https://example.org/audio/en/heart/abc.mp3?v=1', headers: { get: (n) => headers[n.toLowerCase()] ?? null } };
  const waits = [];
  listeners.fetch({ request: req, respondWith: (p) => waits.push(p) });
  const res = await waits[0];
  return { res, network: () => network, again: async () => { const w = []; listeners.fetch({ request: req, respondWith: (p) => w.push(p) }); return w[0]; } };
}

test('a clip request with a Range header gets a 206 slice of the file', async () => {
  const { res } = await audioRequest({ range: 'bytes=2-5' });
  assert.equal(res.status, 206);
  assert.equal(res.headers['Content-Range'], 'bytes 2-5/10');
  assert.deepEqual([...new Uint8Array(res.body)], [2, 3, 4, 5]);
});

test('an open-ended Range (bytes=0-) gets the whole file as 206', async () => {
  const { res } = await audioRequest({ range: 'bytes=0-' });
  assert.equal(res.status, 206);
  assert.equal(res.headers['Content-Range'], 'bytes 0-9/10');
});

test('a clip request without Range gets the file, and a repeat comes from the cache', async () => {
  const t = await audioRequest({});
  assert.equal(t.res.ok, true);
  await t.again();
  assert.equal(t.network(), 1);
});
