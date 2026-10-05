import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadCourse, loadWeek, clearCache, ContentMissing, weekUrl } from '../js/content.js';

const files = {
  'content/nl/week-01.json': { lang: 'nl', week: 1, chunks: [] },
  'content/en/week-01.json': { lang: 'en', week: 1, chunks: [] },
};
let calls = 0;
const fakeFetch = async (url) => {
  calls++;
  if (url === 'content/nl/week-03.json') return { ok: false, status: 500, json: async () => ({}) };
  if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => structuredClone(files[url]) };
};

beforeEach(() => { clearCache(); calls = 0; });

test('weekUrl pads the week', () => assert.equal(weekUrl('nl', 1), 'content/nl/week-01.json'));

test('loadCourse for an existing week returns that week and all earlier ones', async () => {
  const c = await loadCourse(1, fakeFetch);
  assert.equal(c.missing, false);
  assert.equal(c.nl.lang, 'nl');
  assert.equal(c.en.lang, 'en');
  assert.equal(c.weeks.length, 2);
});

test('loadCourse for a week that is not written yet says missing and keeps earlier weeks', async () => {
  const c = await loadCourse(2, fakeFetch);
  assert.equal(c.missing, true);
  assert.equal(c.nl, null);
  assert.equal(c.weeks.length, 2);
});

test('a network failure keeps the weeks that did load and reports the error instead of throwing', async () => {
  const fetchFn = async (url) => (url.includes('week-01') ? fakeFetch(url) : Promise.reject(new TypeError('Failed to fetch')));
  const c = await loadCourse(2, fetchFn);
  assert.equal(c.missing, false);
  assert.equal(c.nl, null);
  assert.equal(c.weeks.length, 2);
  assert.match(String(c.error), /Failed to fetch/);
});

test('a missing week is a ContentMissing error; a server error is a normal error', async () => {
  await assert.rejects(loadWeek('nl', 9, fakeFetch), ContentMissing);
  await assert.rejects(loadWeek('nl', 3, fakeFetch), (e) => !(e instanceof ContentMissing) && /500/.test(e.message));
});

test('files are fetched once and then cached', async () => {
  await loadWeek('nl', 1, fakeFetch);
  await loadWeek('nl', 1, fakeFetch);
  assert.equal(calls, 1);
});
