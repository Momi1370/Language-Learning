import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadVocab, vocabUrl, clearCache } from '../js/content.js';

const files = {
  'content/vocab/pack-01.json': { pack: 1, words: [{ id: 'v-0001' }] },
  'content/vocab/pack-02.json': { pack: 2, draft: true, words: [{ id: 'v-0101' }] },
  'content/vocab/pack-03.json': { pack: 3, words: [{ id: 'v-0201' }] },
};
const fetchWith = (extra = {}) => async (url) => {
  if (url in extra) return extra[url];
  if (!(url in files)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => structuredClone(files[url]) };
};

beforeEach(() => clearCache());

test('vocabUrl pads the pack number', () => assert.equal(vocabUrl(1), 'content/vocab/pack-01.json'));

test('loadVocab loads packs until the first missing one and skips drafts', async () => {
  const r = await loadVocab(fetchWith({ 'content/vocab/pack-03.json': { ok: false, status: 404, json: async () => ({}) } }));
  assert.equal(r.error, null);
  assert.deepEqual(r.packs.map((p) => p.pack), [1]);
});

test('loadVocab with no packs at all is not an error', async () => {
  const r = await loadVocab(async () => ({ ok: false, status: 404, json: async () => ({}) }));
  assert.deepEqual(r, { packs: [], error: null });
});

test('a server error keeps the packs that did load and reports the error', async () => {
  const r = await loadVocab(fetchWith({ 'content/vocab/pack-02.json': { ok: false, status: 500, json: async () => ({}) } }));
  assert.deepEqual(r.packs.map((p) => p.pack), [1]);
  assert.match(r.error.message, /pack-02/);
});

test('a network failure is reported, not thrown', async () => {
  const r = await loadVocab(async () => { throw new TypeError('offline'); });
  assert.deepEqual(r.packs, []);
  assert.equal(r.error.message, 'offline');
});
