import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import {
  introduce, grade, dueQueue, shouldRepeat, nextExtraWords, introduceExtraWords,
  addMyPhrase, deleteMyPhrase, cardView, indexChunks, indexWords,
} from '../js/cards.js';
import { Grade } from '../js/srs.js';
import { validNl, validEn } from './fixtures.mjs';

const now = new Date('2026-10-05T10:00:00Z');
const words = [
  { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment', pos: 'zn', example: 'Ik heb een afspraak.' },
  { id: 'w-0002', text: 'bespreken', article: null, en: 'to discuss', pos: 'ww', example: 'We bespreken het.' },
  { id: 'w-0003', text: 'het doel', article: 'het', en: 'goal', pos: 'zn', example: 'Mijn doel is…' },
];

test('introduce adds new cards once and does not touch the input', () => {
  const s0 = defaultState();
  const s1 = introduce(s0, ['a', 'b'], now);
  assert.deepEqual(Object.keys(s1.cards), ['a', 'b']);
  assert.deepEqual(s0.cards, {});
  assert.equal(introduce(s1, ['a'], now), s1);
});

test('dueQueue lists due cards, oldest due first', () => {
  let s = introduce(defaultState(), ['late'], now);
  s = introduce(s, ['early'], new Date('2026-10-01T10:00:00Z'));
  assert.deepEqual(dueQueue(s, now), ['early', 'late']);
});

test('grading Good twice takes a card out of the due queue', () => {
  let s = introduce(defaultState(), ['a'], now);
  s = grade(s, 'a', Grade.Good, now);
  s = grade(s, 'a', Grade.Good, new Date(s.cards.a.due));
  assert.deepEqual(dueQueue(s, now), []);
});

test('grade throws for an unknown card', () => {
  assert.throws(() => grade(defaultState(), 'nope', Grade.Good, now), /unknown card/);
});

test('shouldRepeat: soon-due cards come back, at most 3 times', () => {
  const soon = { due: new Date(now.getTime() + 60_000).toISOString() };
  const later = { due: new Date(now.getTime() + 3 * 86400_000).toISOString() };
  assert.equal(shouldRepeat(soon, now, 1), true);
  assert.equal(shouldRepeat(soon, now, 3), false);
  assert.equal(shouldRepeat(later, now, 1), false);
});

test('nextExtraWords skips words already in the deck', () => {
  const s = introduce(defaultState(), ['w-0001'], now);
  assert.deepEqual(nextExtraWords(s, words, 2), ['w-0002', 'w-0003']);
  assert.deepEqual(nextExtraWords(s, words, 0), []);
});

test('introduceExtraWords adds words only once per session', () => {
  const s1 = introduceExtraWords(defaultState(), words, 2, '1-1', now);
  assert.deepEqual(Object.keys(s1.cards), ['w-0001', 'w-0002']);
  const s2 = introduceExtraWords(s1, words, 2, '1-1', now);
  assert.equal(s2, s1);
  const s3 = introduceExtraWords(s2, words, 2, '1-2', now);
  assert.deepEqual(Object.keys(s3.cards), ['w-0001', 'w-0002', 'w-0003']);
});

test('addMyPhrase checks input and creates a phrase with a card', () => {
  assert.throws(() => addMyPhrase(defaultState(), { lang: 'nl', text: ' ', meaning: 'x' }, now), /fill in/);
  assert.throws(() => addMyPhrase(defaultState(), { lang: 'fr', text: 'x', meaning: 'x' }, now), /Dutch or English/);
  const { state, id } = addMyPhrase(defaultState(), { lang: 'en', text: ' give or take ', meaning: 'about', note: 'film' }, now, () => 'my-1');
  assert.equal(id, 'my-1');
  assert.deepEqual(state.myPhrases, [{ id: 'my-1', lang: 'en', text: 'give or take', meaning: 'about', note: 'film', created: now.toISOString() }]);
  assert.ok(state.cards['my-1']);
});

test('deleteMyPhrase removes the phrase and its card', () => {
  const { state } = addMyPhrase(defaultState(), { lang: 'nl', text: 'amai', meaning: 'wow' }, now, () => 'my-2');
  const after = deleteMyPhrase(state, 'my-2');
  assert.deepEqual(after.myPhrases, []);
  assert.equal(after.cards['my-2'], undefined);
});

test('cardView finds course chunks, words and my phrases', () => {
  const nl = validNl();
  nl.chunks[0] = { ...nl.chunks[0], text: 'de collega', article: 'de', fa: 'همکار', stress: ['col-LE-ga'], register: 'informal' };
  const sources = {
    chunkIndex: indexChunks([nl, validEn()]),
    wordIndex: indexWords(words),
    myPhrases: [{ id: 'my-3', lang: 'en', text: 'give or take', meaning: 'about', note: 'film' }],
  };
  assert.deepEqual(cardView('nl-01-001', sources), {
    id: 'nl-01-001', kind: 'course', lang: 'nl', text: 'de collega', meaning: 'sentence 0',
    article: 'de', fa: 'همکار', stress: ['col-LE-ga'], note: 'informal',
  });
  assert.equal(cardView('en-01-001', sources).lang, 'en');
  assert.equal(cardView('w-0003', sources).article, 'het');
  assert.equal(cardView('my-3', sources).kind, 'mine');
  assert.equal(cardView('missing', sources), null);
});
