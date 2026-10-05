import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, migrate, createStore, buildExport, parseImport, STORAGE_KEY } from '../js/store.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test('migrate fills in missing fields and settings', () => {
  const s = migrate({ version: 1, position: { week: 2, session: 3 }, settings: { farsi: false } });
  assert.deepEqual(s.position, { week: 2, session: 3 });
  assert.equal(s.settings.farsi, false);
  assert.equal(s.settings.extraWords, 0);
  assert.deepEqual(s.myPhrases, []);
});

test('migrate repairs each field that has the wrong shape, keeping the good ones', () => {
  const s = migrate({
    version: 1,
    position: null,
    done: null,
    history: {},
    settings: 'x',
    cards: [],
    myPhrases: 'oops',
    ear: 5,
    missions: null,
    extraFor: 7,
    finished: 'yes',
  });
  assert.deepEqual(s, defaultState());
  assert.deepEqual(migrate({ version: 1, position: { week: 99, session: 1 } }).position, { week: 1, session: 1 });
  assert.deepEqual(migrate({ version: 1, position: { week: 3, session: 2 }, settings: { farsi: false, extraWords: -4 } }).position, { week: 3, session: 2 });
  assert.equal(migrate({ version: 1, settings: { farsi: false, extraWords: -4 } }).settings.extraWords, 0);
  assert.equal(migrate({ version: 1, settings: { farsi: false } }).settings.farsi, false);
});

test('migrate turns garbage or unknown versions into a fresh state', () => {
  assert.deepEqual(migrate(null), defaultState());
  assert.deepEqual(migrate('hello'), defaultState());
  assert.deepEqual(migrate({ version: 99 }), defaultState());
});

test('store saves and loads', () => {
  const store = createStore(memoryStorage());
  assert.equal(store.available, true);
  const s = { ...defaultState(), done: ['cards'] };
  assert.equal(store.save(s), true);
  assert.deepEqual(store.load(), s);
});

test('store survives broken saved JSON', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY, '{oops');
  assert.deepEqual(createStore(storage).load(), defaultState());
});

test('store without working storage still loads a fresh state', () => {
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() {} };
  for (const storage of [broken, null]) {
    const store = createStore(storage);
    assert.equal(store.available, false);
    assert.deepEqual(store.load(), defaultState());
    assert.equal(store.save(defaultState()), false);
  }
});

test('export then import gives back the same state and recordings', async () => {
  const state = { ...defaultState(), history: [{ date: '2026-10-05', week: 1, session: 1 }] };
  const bytes = new Uint8Array([0, 1, 2, 250, 255]);
  const text = await buildExport(state, [{ id: 'nl-01', date: '2026-10-09T10:00:00.000Z', blob: new Blob([bytes], { type: 'audio/mp4' }) }]);
  const back = parseImport(text);
  assert.deepEqual(back.state, state);
  assert.equal(back.diary[0].id, 'nl-01');
  assert.equal(back.diary[0].blob.type, 'audio/mp4');
  assert.deepEqual(new Uint8Array(await back.diary[0].blob.arrayBuffer()), bytes);
});

test('import rejects files that are not backups', () => {
  assert.throws(() => parseImport('not json'), /not a Taalmaatje backup/);
  assert.throws(() => parseImport('{"app":"other"}'), /not a Taalmaatje backup/);
});
