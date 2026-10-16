import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, migrate } from '../js/store.js';
import { newCard } from '../js/srs.js';
import {
  langOfId, stageOf, stageCounts, noteLearned, backfillLearned, learnedSince, trickyIds,
  pickSpotCheck, resolveSpotCheck, finishSpotCheck,
} from '../js/learned.js';

const day = new Date('2026-10-16T09:00:00');
const next = new Date('2026-10-17T09:00:00');
const withCards = (cards, vocab = {}) => {
  const s = defaultState();
  return { ...s, cards, vocab: { ...s.vocab, ...vocab } };
};
const card = (o) => ({ ...newCard(day), ...o });

test('stageOf: undecided, claimed and confirmed words have no card', () => {
  const s = withCards({}, { known: ['v-0002', 'v-0003'], checked: ['v-0003'] });
  assert.equal(stageOf(s, 'v-0001'), 'new');
  assert.equal(stageOf(s, 'v-0002'), 'claimed');
  assert.equal(stageOf(s, 'v-0003'), 'confirmed');
});

test('stageOf: a card is learning, familiar or learned by stability and reviews', () => {
  const s = withCards({
    a: card({ reps: 0 }),
    b: card({ reps: 2, stability: 6.9 }),
    c: card({ reps: 2, stability: 7 }),
    d: card({ reps: 3, stability: 21 }),
    e: card({ reps: 2, stability: 40 }),
    f: card({ reps: 5, stability: undefined }),
    g: card({ reps: 5, stability: 0 }),
  });
  const stages = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => [id, stageOf(s, id)]));
  assert.deepEqual(stages, { a: 'learning', b: 'learning', c: 'familiar', d: 'learned', e: 'familiar', f: 'learning', g: 'learning' });
});

test('langOfId reads the language from the id', () => {
  assert.equal(langOfId('d-0001'), 'nl');
  assert.equal(langOfId('v-0001'), 'en');
  assert.equal(langOfId('nl-01-001'), null);
  assert.equal(langOfId('my-abc'), null);
});

test('stageCounts counts one language only, from the state alone', () => {
  const s = withCards({
    'v-0001': card({ reps: 3, stability: 30 }),
    'v-0002': card({ reps: 1, stability: 2 }),
    'd-0001': card({ reps: 3, stability: 30 }),
    'nl-01-001': card({ reps: 9, stability: 99 }),
  }, { known: ['v-0003', 'v-0004', 'd-0002'], checked: ['v-0004'] });
  assert.deepEqual(stageCounts(s, 'en'), { learning: 1, familiar: 0, learned: 1, claimed: 1, confirmed: 1 });
  assert.deepEqual(stageCounts(s, 'nl'), { learning: 0, familiar: 0, learned: 1, claimed: 1, confirmed: 0 });
});

test('noteLearned records the first day a word is learned and never changes it', () => {
  const s = withCards({ 'v-0001': card({ reps: 3, stability: 30 }), 'v-0002': card({ reps: 1, stability: 30 }) });
  const once = noteLearned(s, 'v-0001', day);
  assert.equal(once.vocab.learnedOn['v-0001'], '2026-10-16');
  assert.equal(noteLearned(once, 'v-0001', next).vocab.learnedOn['v-0001'], '2026-10-16');
  assert.equal(noteLearned(s, 'v-0002', day), s);
});

test('backfillLearned dates each learned card by its last review', () => {
  const s = withCards({
    'v-0001': card({ reps: 3, stability: 30, last_review: '2026-09-01T10:00:00.000Z' }),
    'v-0002': card({ reps: 3, stability: 30 }),
    'v-0003': card({ reps: 1, stability: 2 }),
    'nl-01-001': card({ reps: 9, stability: 99 }),
  });
  const b = backfillLearned(s, day);
  assert.equal(b.vocab.learnedOn['v-0001'], '2026-09-01');
  assert.equal(b.vocab.learnedOn['v-0002'], '2026-10-16');
  assert.deepEqual(Object.keys(b.vocab.learnedOn).sort(), ['v-0001', 'v-0002']);
});

test('learnedSince counts a language’s learned-on dates from a day on', () => {
  const s = withCards({}, { learnedOn: { 'v-0001': '2026-10-10', 'v-0002': '2026-10-01', 'd-0001': '2026-10-12' } });
  assert.equal(learnedSince(s, 'en', '2026-10-09'), 1);
  assert.equal(learnedSince(s, 'en', '2026-09-30'), 2);
  assert.equal(learnedSince(s, 'nl', '2026-10-09'), 1);
});

test('trickyIds lists words with two or more lapses, worst first, within the limit', () => {
  const s = withCards({
    'v-0001': card({ lapses: 1 }), 'v-0002': card({ lapses: 2 }), 'v-0003': card({ lapses: 5 }), 'd-0001': card({ lapses: 9 }),
  });
  assert.deepEqual(trickyIds(s, 'en'), ['v-0003', 'v-0002']);
  assert.deepEqual(trickyIds(s, 'en', 1), ['v-0003']);
});

test('pickSpotCheck: nothing to check, or already done today, gives no words', () => {
  assert.deepEqual(pickSpotCheck(defaultState(), 'en', day), []);
  const s = withCards({}, { known: ['v-0001'], checked: ['v-0001'] });
  assert.deepEqual(pickSpotCheck(s, 'en', day), []);
  const done = finishSpotCheck(withCards({}, { known: ['v-0001'] }), 'en', day);
  assert.deepEqual(pickSpotCheck(done, 'en', day), []);
  assert.equal(pickSpotCheck(done, 'en', next).length, 1);
});

test('pickSpotCheck takes up to three claimed words of the language, steady for a day', () => {
  const known = ['v-0001', 'v-0002', 'v-0003', 'v-0004', 'v-0005', 'v-0006', 'd-0001'];
  const s = withCards({}, { known, checked: ['v-0002'] });
  const picks = pickSpotCheck(s, 'en', day);
  assert.equal(picks.length, 3);
  assert.ok(picks.every((id) => id.startsWith('v-') && id !== 'v-0002'));
  assert.deepEqual(pickSpotCheck(s, 'en', day), picks);
  assert.notDeepEqual(pickSpotCheck(s, 'en', next), picks);
  assert.deepEqual(pickSpotCheck(s, 'nl', day), ['d-0001']);
});

test('resolveSpotCheck confirms a word you knew and teaches one you did not', () => {
  const s = withCards({}, { known: ['v-0001', 'v-0002'] });
  const yes = resolveSpotCheck(s, 'v-0001', true, day);
  assert.deepEqual(yes.vocab.checked, ['v-0001']);
  assert.equal(stageOf(yes, 'v-0001'), 'confirmed');
  const no = resolveSpotCheck(s, 'v-0002', false, day);
  assert.ok(!no.vocab.known.includes('v-0002'));
  assert.equal(no.cards['v-0002'].reps, 0);
});

test('the new vocabulary fields round-trip through migrate', () => {
  const s = withCards({}, { checked: ['v-0001'], learnedOn: { 'v-0001': '2026-10-01' }, checkDay: { en: '2026-10-16', nl: '' } });
  const m = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(m.vocab.checked, ['v-0001']);
  assert.deepEqual(m.vocab.learnedOn, { 'v-0001': '2026-10-01' });
  assert.deepEqual(m.vocab.checkDay, { en: '2026-10-16', nl: '' });
});

test('an old save without the new fields gets the defaults and keeps what it had', () => {
  const old = { version: 1, vocab: { known: ['v-0001'], day: { date: '', batches: {} }, reviews: { key: '', count: 0 } } };
  const m = migrate(old);
  assert.deepEqual(m.vocab.known, ['v-0001']);
  assert.deepEqual(m.vocab.checked, []);
  assert.deepEqual(m.vocab.learnedOn, {});
  assert.deepEqual(m.vocab.checkDay, { en: '', nl: '' });
});

test('garbage in the new fields is replaced by defaults, other fields stay', () => {
  const m = migrate({ version: 1, vocab: { known: ['v-0001'], checked: 5, learnedOn: { a: 3 }, checkDay: { en: 4, nl: 'x' } } });
  assert.deepEqual(m.vocab.known, ['v-0001']);
  assert.deepEqual(m.vocab.checked, []);
  assert.deepEqual(m.vocab.learnedOn, {});
  assert.deepEqual(m.vocab.checkDay, { en: '', nl: 'x' });
});
