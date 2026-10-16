import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState } from '../js/store.js';
import { newCard } from '../js/srs.js';
import { cardView } from '../js/cards.js';
import {
  VOCAB_REVIEW_CAP, isVocabId, wordsOf, indexVocab, statusOf, ensureBatch, batchLeft, markKnown, teach,
  searchVocab, vocabCounts, newCount, settleBatch, promptExample, reviewKey, reviewsLeft, capQueue, countReview,
} from '../js/vocab.js';

const id = (n) => `v-${String(n).padStart(4, '0')}`;
const word = (n) => ({
  id: id(n), word: `word${n}`, pos: 'noun', forms: [`word${n}`], ipa: 'ˈwɝd', stress: ['WORD'],
  fa: { meaning: `معنی ${n}`, note: 'نکته' },
  examples: [{ text: `This is word${n} here today.`, fa: 'الف' }, { text: `Use word${n} in a sentence now.`, fa: 'ب' }],
});
const packs = [
  { pack: 1, track: 'everyday', words: Array.from({ length: 12 }, (_, i) => word(i + 1)) },
  { pack: 2, track: 'university', words: Array.from({ length: 6 }, (_, i) => word(i + 21)) },
];
const words = wordsOf(packs);
const day1 = new Date('2026-10-16T09:00:00');
const day2 = new Date('2026-10-17T09:00:00');
const ids = (...ns) => ns.map(id);

test('isVocabId recognises vocabulary card ids only', () => {
  assert.ok(isVocabId('v-0001'));
  assert.ok(!isVocabId('w-0001'));
  assert.ok(!isVocabId('nl-01-001'));
});

test('wordsOf gives each word the section of its pack', () => {
  assert.equal(words.length, 18);
  assert.equal(words[0].track, 'everyday');
  assert.equal(words[12].track, 'university');
  assert.equal(indexVocab(packs)[id(21)].track, 'university');
});

test('the day’s batch is the next 10 undecided words of the chosen section in pack order, stored with the date', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.deepEqual(s.vocab.day, { date: '2026-10-16', batches: { everyday: ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10) } });
  assert.deepEqual(batchLeft(s), ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
});

test('the university section draws only from university packs', () => {
  const s0 = defaultState();
  const s = ensureBatch({ ...s0, settings: { ...s0.settings, vocabTrack: 'university' } }, words, day1);
  assert.deepEqual(s.vocab.day, { date: '2026-10-16', batches: { university: ids(21, 22, 23, 24, 25, 26) } });
});

test('each section keeps its own batch for the day: switching away and back changes nothing', () => {
  let a = ensureBatch(defaultState(), words, day1);
  a = markKnown(a, id(1));
  a = teach(a, id(2), day1);
  const uni = { ...a, settings: { ...a.settings, vocabTrack: 'university' } };
  const b = ensureBatch(uni, words, day1);
  assert.deepEqual(b.vocab.day.batches.university, ids(21, 22, 23, 24, 25, 26));
  assert.deepEqual(batchLeft(b), ids(21, 22, 23, 24, 25, 26));
  const back = ensureBatch({ ...b, settings: { ...b.settings, vocabTrack: 'everyday' } }, words, day1);
  assert.deepEqual(back.vocab.day.batches.everyday, ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), 'the everyday batch is not drawn again');
  assert.deepEqual(batchLeft(back), ids(3, 4, 5, 6, 7, 8, 9, 10));
});

test('a new day clears every section’s batch', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = ensureBatch({ ...s, settings: { ...s.settings, vocabTrack: 'university' } }, words, day1);
  s = ensureBatch({ ...s, settings: { ...s.settings, vocabTrack: 'everyday' } }, words, day2);
  assert.deepEqual(Object.keys(s.vocab.day.batches), ['everyday']);
  assert.equal(s.vocab.day.date, '2026-10-17');
});

test('newCount counts the undecided words of a section', () => {
  let s = markKnown(defaultState(), id(1));
  s = teach(s, id(2), day1);
  assert.equal(newCount(s, words, 'everyday'), 10);
  assert.equal(newCount(s, words, 'university'), 6);
});

test('settleBatch marks the words you did not tick as known and leaves the ticked ones to learn', () => {
  const s0 = ensureBatch(defaultState(), words, day1);
  const s = settleBatch(s0, ids(2, 5));
  assert.deepEqual(batchLeft(s), ids(2, 5));
  assert.equal(statusOf(s, id(1)), 'known');
  assert.equal(statusOf(s, id(3)), 'known');
  assert.equal(statusOf(s, id(2)), 'new');
  assert.equal(statusOf(s, id(11)), 'new', 'words outside the batch are untouched');
  assert.deepEqual(s.cards, {});
});

test('settleBatch with no ticks marks the whole batch known, and ignores ticks outside the batch', () => {
  const s0 = ensureBatch(defaultState(), words, day1);
  assert.deepEqual(batchLeft(settleBatch(s0, [])), []);
  assert.equal(settleBatch(s0, []).vocab.known.length, 10);
  assert.equal(statusOf(settleBatch(s0, [id(15)]), id(15)), 'new');
});

test('reopening on the same day gives exactly the same batch, and a smaller setting never removes words', () => {
  const s = ensureBatch(defaultState(), words, day1);
  assert.equal(ensureBatch(s, words, day1), s);
  const smaller = { ...s, settings: { ...s.settings, vocabPerDay: 5 } };
  assert.equal(ensureBatch(smaller, words, day1), smaller);
});

test('a larger setting adds words to today’s batch (the ones already there stay first)', () => {
  const small = { ...defaultState(), settings: { ...defaultState().settings, vocabPerDay: 5 } };
  let s = ensureBatch(small, words, day1);
  s = markKnown(s, id(1));
  assert.deepEqual(s.vocab.day.batches.everyday, ids(1, 2, 3, 4, 5));
  const bigger = ensureBatch({ ...s, settings: { ...s.settings, vocabPerDay: 10 } }, words, day1);
  assert.deepEqual(bigger.vocab.day.batches.everyday, ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
  assert.equal(ensureBatch(bigger, words, day1), bigger, 'nothing more to add the second time');
});

test('a larger setting stops adding when the section has no more undecided words', () => {
  const few = [{ pack: 1, track: 'everyday', words: Array.from({ length: 6 }, (_, i) => word(i + 1)) }];
  const small = { ...defaultState(), settings: { ...defaultState().settings, vocabPerDay: 5 } };
  const s = ensureBatch(small, wordsOf(few), day1);
  const bigger = ensureBatch({ ...s, settings: { ...s.settings, vocabPerDay: 15 } }, wordsOf(few), day1);
  assert.deepEqual(bigger.vocab.day.batches.everyday, ids(1, 2, 3, 4, 5, 6));
  assert.equal(ensureBatch(bigger, wordsOf(few), day1), bigger);
});

test('the next day gives the next undecided words; words skipped yesterday come back', () => {
  let s = ensureBatch(defaultState(), words, day1);
  s = markKnown(s, id(1));
  s = teach(s, id(2), day1);
  s = ensureBatch(s, words, day2);
  assert.deepEqual(s.vocab.day, { date: '2026-10-17', batches: { everyday: ids(3, 4, 5, 6, 7, 8, 9, 10, 11, 12) } });
});

test('with no words loaded, no batch is stored for the day (a failed load must not use up the day)', () => {
  const s = defaultState();
  assert.equal(ensureBatch(s, [], day1), s);
  assert.equal(s.vocab.day.date, '');
});

test('when every word is decided the batch is empty', () => {
  let s = defaultState();
  for (const w of words) s = markKnown(s, w.id);
  assert.deepEqual(ensureBatch(s, words, day1).vocab.day.batches.everyday, []);
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
  assert.deepEqual(batchLeft(s), ids(2, 4, 5, 6, 7, 8, 9, 10));
});

test('search finds a word by its English spelling or its Farsi meaning', () => {
  assert.deepEqual(searchVocab(words, 'WORD1').map((w) => w.id), ids(1, 10, 11, 12));
  assert.deepEqual(searchVocab(words, 'معنی 7').map((w) => w.id), ids(7));
  assert.equal(searchVocab(words, '  ').length, 18);
  assert.deepEqual(searchVocab(words, 'zzz'), []);
});

test('counts show words learning and known', () => {
  let s = markKnown(defaultState(), id(1));
  s = teach(s, id(2), day1);
  s = teach(s, id(3), day1);
  assert.deepEqual(vocabCounts(s), { learning: 2, known: 1 });
});

const reviewCards = (n) => Object.fromEntries(Array.from({ length: n }, (_, i) => [id(i + 1), { ...newCard(day1), reps: 1 }]));

test('at most 10 vocabulary reviews are shown per session; other cards are untouched', () => {
  const cards = { ...reviewCards(12), 'nl-01-001': newCard(day1) };
  let s = { ...defaultState(), cards };
  const queue = Object.keys(cards);
  const key = reviewKey({ week: 1, session: 2 }, day1);
  assert.equal(key, '1-2-2026-10-16');
  const capped = capQueue(queue, s, key);
  assert.equal(capped.filter(isVocabId).length, VOCAB_REVIEW_CAP);
  assert.ok(capped.includes('nl-01-001'));
  assert.deepEqual(capped.filter(isVocabId), ids(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
  for (let i = 0; i < 4; i++) s = countReview(s, key);
  assert.equal(reviewsLeft(s, key), 6);
  assert.equal(capQueue(queue, s, key).filter(isVocabId).length, 6);
  assert.equal(reviewsLeft(s, reviewKey({ week: 1, session: 3 }, day1)), 10, 'a new session starts with a full allowance');
  assert.deepEqual(s.vocab.reviews, { key, count: 4 });
});

test('words shown for the first time are never capped, so new words always appear', () => {
  const cards = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [id(i + 1), newCard(day1)]));
  const s = { ...defaultState(), cards };
  const key = reviewKey({ week: 1, session: 1 }, day1);
  assert.equal(capQueue(Object.keys(cards), s, key).length, 15);
  const used = { ...s, vocab: { ...s.vocab, reviews: { key, count: 10 } } };
  assert.equal(capQueue(Object.keys(cards), used, key).length, 15);
});

test('cards in the exempt set (a new word’s repeat in the same session) stay even when the allowance is used up', () => {
  const s0 = { ...defaultState(), cards: reviewCards(3) };
  const key = reviewKey({ week: 1, session: 1 }, day1);
  const s = { ...s0, vocab: { ...s0.vocab, reviews: { key, count: 10 } } };
  assert.deepEqual(capQueue(ids(1, 2, 3), s, key), []);
  assert.deepEqual(capQueue(ids(1, 2, 3), s, key, new Set([id(2)])), ids(2));
});

test('the allowance starts again each day, even when the course position has not moved', () => {
  const position = { week: 5, session: 1 };
  const k1 = reviewKey(position, day1);
  const k2 = reviewKey(position, day2);
  assert.notEqual(k1, k2);
  let s = defaultState();
  for (let i = 0; i < 10; i++) s = countReview(s, k1);
  assert.equal(reviewsLeft(s, k1), 0);
  assert.equal(reviewsLeft(s, k2), 10);
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

test('the review prompt uses the present-tense example when a word has one, else the first', () => {
  const w = word(1);
  assert.equal(promptExample(w), w.examples[0]);
  const w2 = { ...w, examples: [{ tense: 'past', text: 'a' }, { tense: 'present', text: 'b' }, { tense: 'future', text: 'c' }] };
  assert.equal(promptExample(w2).text, 'b');
});
