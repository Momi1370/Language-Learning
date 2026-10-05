import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareWords, bestMatch, normaliseWord } from '../js/match.js';

const oks = (r) => r.words.map((w) => w.ok);

test('exact sentence: every word understood', () => {
  const r = compareWords('Kan je dat nog eens herhalen?', 'kan je dat nog eens herhalen', 'nl');
  assert.equal(r.score, 1);
  assert.deepEqual(oks(r), [true, true, true, true, true, true]);
});

test('a missing word is marked', () => {
  const r = compareWords('Kan je dat nog eens herhalen?', 'kan je nog eens herhalen', 'nl');
  assert.deepEqual(oks(r), [true, true, false, true, true, true]);
  assert.equal(r.score, 5 / 6);
});

test('case and punctuation are ignored, original text is kept', () => {
  const r = compareWords('Goeiemorgen!', 'goeiemorgen', 'nl');
  assert.deepEqual(r.words, [{ text: 'Goeiemorgen!', ok: true }]);
});

test('digits match number words', () => {
  assert.equal(compareWords('Ik werk hier twee jaar.', 'ik werk hier 2 jaar', 'nl').score, 1);
  assert.equal(compareWords('I have three classes.', 'I have 3 classes', 'en').score, 1);
});

test('accents are ignored', () => {
  assert.equal(compareWords('Dat is één koffie.', 'dat is een koffie', 'nl').score, 1);
});

test('placeholder tokens are not checked and extra words are fine', () => {
  const r = compareWords("I'm doing a master's in …", "I'm doing a master's in economics", 'en');
  assert.equal(r.score, 1);
  assert.equal(r.words.at(-1).ok, null);
});

test('curly apostrophes match straight ones', () => {
  assert.equal(normaliseWord('master’s', 'en'), normaliseWord("master's", 'en'));
});

test('bestMatch picks the alternative with most words understood', () => {
  const r = bestMatch('Zin in koffie?', ['zin in kopje', 'zin in koffie'], 'nl');
  assert.equal(r.score, 1);
});

test('nothing heard: score 0, all words missed', () => {
  const r = bestMatch('Tot morgen!', [], 'nl');
  assert.equal(r.score, 0);
  assert.deepEqual(oks(r), [false, false]);
});
