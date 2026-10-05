import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve } from '../tools/serve.mjs';

const server = await serve(0);
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test('serves index.html for / as HTML', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.match(await res.text(), /<title>Taalmaatje<\/title>/);
});

test('serves JS modules with a JavaScript type', async () => {
  const res = await fetch(`${base}/js/srs.js`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});

test('missing files are 404', async () => {
  assert.equal((await fetch(`${base}/content/nl/week-99.json`)).status, 404);
});

test('cannot read outside the project folder', async () => {
  const res = await fetch(`${base}/..%2F..%2Fpackage.json`);
  assert.notEqual(res.status, 200);
});

test('handles many parallel requests', async () => {
  const results = await Promise.all(Array.from({ length: 40 }, () => fetch(`${base}/js/session.js`).then((r) => r.status)));
  assert.ok(results.every((s) => s === 200));
});
