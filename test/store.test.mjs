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

test('a fresh state has an empty vocabulary section, 10 new words a day and the everyday section', () => {
  const s = defaultState();
  assert.deepEqual(s.vocab, { known: [], checked: [], learnedOn: {}, checkDay: { en: '', nl: '' }, day: { date: '', batches: {} }, reviews: { key: '', count: 0 }, perDayReset: true });
  assert.equal(s.settings.vocabPerDay, 10);
  assert.equal(s.settings.vocabTrack, 'everyday');
});

test('an old save or backup without vocabulary data still loads, with the defaults', () => {
  const s = migrate({ version: 1, position: { week: 2, session: 3 }, settings: { farsi: false } });
  assert.deepEqual(s.vocab, defaultState().vocab);
  assert.equal(s.settings.vocabPerDay, 10);
  assert.equal(s.settings.vocabTrack, 'everyday');
});

test('good vocabulary data is kept and broken parts are reset', () => {
  const good = { known: ['v-0001'], checked: ['v-0001'], learnedOn: { 'v-0001': '2026-10-01' }, checkDay: { en: '2026-10-16', nl: '' }, day: { date: '2026-10-16', batches: { everyday: ['v-0001'], university: ['v-0002'] } }, reviews: { key: '1-2', count: 3 }, perDayReset: true };
  assert.deepEqual(migrate({ version: 1, vocab: good, settings: { vocabPerDay: 15 } }).vocab, good);
  assert.equal(migrate({ version: 1, settings: { vocabPerDay: 15 } }).settings.vocabPerDay, 15);
  assert.equal(migrate({ version: 1, settings: { vocabPerDay: 7 } }).settings.vocabPerDay, 10);
  assert.equal(migrate({ version: 1, settings: { vocabTrack: 'university' } }).settings.vocabTrack, 'university');
  assert.equal(migrate({ version: 1, settings: { vocabTrack: 'nope' } }).settings.vocabTrack, 'everyday');
  const broken = migrate({ version: 1, vocab: { known: 'x', day: { date: 5 }, reviews: { key: 'a', count: -1 } } });
  assert.deepEqual(broken.vocab, defaultState().vocab);
  assert.deepEqual(migrate({ version: 1, vocab: 'nope' }).vocab, defaultState().vocab);
});

test('a day saved before sections existed counts as the everyday batch', () => {
  const old = { known: [], day: { date: '2026-10-16', ids: ['v-0002'] }, reviews: { key: '', count: 0 }, perDayReset: true };
  assert.deepEqual(migrate({ version: 1, vocab: old }).vocab.day, { date: '2026-10-16', batches: { everyday: ['v-0002'] } });
  const interim = { ...old, day: { date: '2026-10-16', track: 'university', ids: ['v-0230'] } };
  assert.deepEqual(migrate({ version: 1, vocab: interim }).vocab.day, { date: '2026-10-16', batches: { university: ['v-0230'] } });
  const broken = { ...old, day: { date: '2026-10-16', batches: { everyday: 'x', nope: ['v-0001'], university: ['v-0230'] } } };
  assert.deepEqual(migrate({ version: 1, vocab: broken }).vocab.day, { date: '2026-10-16', batches: { university: ['v-0230'] } });
});

test('the old default of 5 words a day moves to 10 once; a later choice of 5 is kept', () => {
  const before = migrate({ version: 1, settings: { vocabPerDay: 5 }, vocab: { known: [], day: { date: '', ids: [] }, reviews: { key: '', count: 0 } } });
  assert.equal(before.settings.vocabPerDay, 10);
  assert.equal(before.vocab.perDayReset, true);
  assert.equal(migrate({ version: 1, settings: { vocabPerDay: 3 } }).settings.vocabPerDay, 3);
  const chosen = migrate({ version: 1, settings: { vocabPerDay: 5 }, vocab: { known: [], day: { date: '', batches: {} }, reviews: { key: '', count: 0 }, perDayReset: true } });
  assert.equal(chosen.settings.vocabPerDay, 5);
});

test('the recorded voice choice defaults to "mixed" and keeps any text the learner picked', () => {
  assert.deepEqual(defaultState().settings.clipVoice, { en: 'mixed', nl: 'mixed' });
  assert.deepEqual(migrate({ version: 1 }).settings.clipVoice, { en: 'mixed', nl: 'mixed' });
  assert.deepEqual(migrate({ version: 1, settings: { clipVoice: { en: 'emma', nl: 5 } } }).settings.clipVoice, { en: 'emma', nl: 'mixed' });
  assert.deepEqual(migrate({ version: 1, settings: { clipVoice: 'x' } }).settings.clipVoice, { en: 'mixed', nl: 'mixed' });
});
