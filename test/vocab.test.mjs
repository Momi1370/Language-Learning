import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { newCard } from '../js/srs.js';
import { cardView } from '../js/cards.js';
import {
  VOCAB_REVIEW_CAP, isVocabId, wordsOf, indexVocab, statusOf, ensureBatch, batchLeft, markKnown, teach,
  searchVocab, vocabCounts, reviewKey, reviewsLeft, capQueue, countReview,
} from '../js/vocab.js';

const id = (n) => `v-${String(n).padStart(4, '0')}`;
const word = (n) => ({
  id: id(n), word: `word${n}`, pos: 'noun', forms: [`word${n}`], ipa: 'ˈwɝd', stress: ['WORD'],
  fa: { meaning: `معنی ${n}`, note: 'نکته' },
  examples: [{ text: `This is word${n} here today.`, fa: 'الف' }, { text: `Use word${n} in a sentence now.`, fa: 'ب' }],
});
const packs = [{ pack: 1, words: Array.from({ length: 12 }, (_, i) => word(i + 1)) }];
const words = wordsOf(packs);
const day1 = new Date('2026-10-16T09:00:00');
const day2 = new Date('2026-10-17T09:00:00');
const ids = (...ns) => ns.map(id);

test('isVocabId recognises vocabulary card ids only', () => {
  assert.ok(isVocabId('v-0001'));
  assert.ok(!isVocabId('w-0001'));
  assert.ok(!isVocabId('nl-01-001'));
});

test('the day’s batch is the next 5 undecided words in pack order, stored with the date', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.deepEqual(s.vocab.day, { date: '2026-10-16', ids: ids(1, 2, 3, 4, 5) });
  assert.deepEqual(batchLeft(s), ids(1, 2, 3, 4, 5));
});

test('reopening on the same day gives exactly the same batch, even if the setting changed', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.equal(ensureBatch(s, words, day1), s);
  const bigger = { ...s, settings: { ...s.settings, vocabPerDay: 10 } };
  assert.equal(ensureBatch(bigger, words, day1), bigger);
});

test('the next day gives the next undecided words; words skipped yesterday come back', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = markKnown(s, id(1));
  s = teach(s, id(2), day1);
  s = ensureBatch(s, words, day2);
  assert.deepEqual(s.vocab.day, { date: '2026-10-17', ids: ids(3, 4, 5, 6, 7) });
});

test('with no words loaded, no batch is stored for the day (a failed load must not use up the day)', () => {
  const s = defaultState();
  assert.equal(ensureBatch(s, [], day1), s);
  assert.equal(s.vocab.day.date, '');
});

test('when every word is decided the batch is empty', () => {
  let s = defaultState();
  for (const w of words) s = markKnown(s, w.id);
  assert.deepEqual(ensureBatch(s, words, day1).vocab.day.ids, []);
});

test('"I know it" saves the word as known without a card; "Teach me" makes a card', () => {
  let s = markKnown(defaultState(), id(1));
  assert.equal(statusOf(s, id(1)), 'known');
  assert.deepEqual(s.cards, {});
  s = teach(s, id(1), day1);
  assert.equal(statusOf(s, id(1)), 'learning');
  assert.deepEqual(s.vocab.known, []);
  assert.ok(s.cards[id(1)]);
  assert.equal(markKnown(s, id(1)), s);
  assert.equal(statusOf(s, id(9)), 'new');
});

test('batchLeft hides decided words', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = markKnown(s, id(1));
  s = teach(s, id(3), day1);
  assert.deepEqual(batchLeft(s), ids(2, 4, 5));
});

test('search finds a word by its English spelling or its Farsi meaning', () => {
  assert.deepEqual(searchVocab(words, 'WORD1').map((w) => w.id), ids(1, 10, 11, 12));
  assert.deepEqual(searchVocab(words, 'معنی 7').map((w) => w.id), ids(7));
  assert.equal(searchVocab(words, '  ').length, 12);
  assert.deepEqual(searchVocab(words, 'zzz'), []);
});

test('counts show words learning and known', () => {
  let s = markKnown(defaultState(), id(1));
  s = teach(s, id(2), day1);
  s = teach(s, id(3), day1);
  assert.deepEqual(vocabCounts(s), { learning: 2, known: 1 });
});

test('at most 10 vocabulary cards are shown per session; other cards are untouched', () => {
  const cards = {};
  for (let n = 1; n <= 12; n++) cards[id(n)] = newCard(day1);
  cards['nl-01-001'] = newCard(day1);
  let s = { ...defaultState(), cards };
  const queue = [...Object.keys(cards)];
  const key = reviewKey({ week: 1, session: 2 });
  assert.equal(key, '1-2');
  const capped = capQueue(queue, s, key);
  assert.equal(capped.filter(isVocabId).length, VOCAB_REVIEW_CAP);
  assert.ok(capped.includes('nl-01-001'));
  assert.deepEqual(capped.filter(isVocabId), ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
  for (let i = 0; i < 4; i++) s = countReview(s, key);
  assert.equal(reviewsLeft(s, key), 6);
  assert.equal(capQueue(queue, s, key).filter(isVocabId).length, 6);
  assert.equal(reviewsLeft(s, '1-3'), 10, 'a new session starts with a full allowance');
  assert.deepEqual(s.vocab.reviews, { key, count: 4 });
});

test('cardView gives a vocabulary card in English with the Farsi meaning as its prompt', () => {
  const v = cardView(id(4), { chunkIndex: {}, wordIndex: {}, myPhrases: [], vocabIndex: indexVocab(packs) });
  assert.equal(v.kind, 'vocab');
  assert.equal(v.lang, 'en');
  assert.equal(v.text, 'word4');
  assert.equal(v.meaning, 'معنی 4');
  assert.equal(v.vocab.id, id(4));
  assert.equal(cardView(id(99), { chunkIndex: {}, wordIndex: {}, myPhrases: [], vocabIndex: indexVocab(packs) }), null);
  assert.equal(cardView(id(4), { chunkIndex: {}, wordIndex: {}, myPhrases: [] }), null, 'works without a vocabIndex');
});
