import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWeek, validateWords } from '../tools/schema.mjs';
import { validNl, validEn } from './fixtures.mjs';

const nl = { lang: 'nl', week: 1 };
const en = { lang: 'en', week: 1 };
const has = (errors, text) => errors.some((e) => e.includes(text));

test('a complete Dutch week has no errors', () => assert.deepEqual(validateWeek(validNl(), nl), []));
test('a complete English week has no errors', () => assert.deepEqual(validateWeek(validEn(), en), []));

test('too few chunks is reported', () => {
  const w = validNl(); w.chunks.pop();
  assert.ok(has(validateWeek(w, nl), 'chunks needs at least 25'));
});

test('a Dutch chunk without article is reported', () => {
  const w = validNl(); delete w.chunks[0].article;
  assert.ok(has(validateWeek(w, nl), 'chunks[0].article'));
});

test('an English chunk with an article is reported', () => {
  const w = validEn(); w.chunks[0].article = 'de';
  assert.ok(has(validateWeek(w, en), 'article is only for Dutch'));
});

test('a duplicate chunk id is reported', () => {
  const w = validNl(); w.chunks[1].id = w.chunks[0].id;
  assert.ok(has(validateWeek(w, nl), 'used twice'));
});

test('a chunk id from another week is reported', () => {
  const w = validNl(); w.chunks[0].id = 'nl-02-001';
  assert.ok(has(validateWeek(w, nl), 'chunks[0].id must look like nl-01-001'));
});

test('a speaking prompt without model answer is reported', () => {
  const w = validEn(); delete w.speaking[2].model;
  assert.ok(validateWeek(w, en).includes('speaking[2].model is required'));
});

test('a sound pair with the same spelling is reported', () => {
  const w = validEn(); w.sound.pairs[0] = ['present', 'Present'];
  assert.ok(has(validateWeek(w, en), 'spelled differently'));
});

test('wrong week number is reported', () => {
  assert.ok(validateWeek(validNl(), { lang: 'nl', week: 2 }).includes('week must be 2'));
});

test('Dutch-only parts are required for Dutch', () => {
  const w = validNl(); delete w.limburg; delete w.grammar;
  const errors = validateWeek(w, nl);
  assert.ok(has(errors, 'limburg needs at least 6'));
  assert.ok(has(errors, 'grammar needs id, title and explain'));
});

test('a Limburg standard form with a note in brackets is reported (it is read aloud and spoken)', () => {
  const w = validNl(); w.limburg[0].standard = 'Mijn mobieltje (Netherlands Dutch)';
  assert.ok(has(validateWeek(w, nl), 'limburg[0].standard must be only the Dutch to say'));
});

test('a dialogue with too few lines is reported', () => {
  const w = validNl(); w.dialogues[0].lines.length = 7;
  assert.ok(has(validateWeek(w, nl), 'dialogues[0] needs 8–12 lines'));
});

test('words: bad id and bad article are reported', () => {
  const errors = validateWords([
    { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment' },
    { id: 'x', text: 'het huis', article: 'het', en: 'house' },
    { id: 'w-0003', text: 'lopen', article: 'the', en: 'to walk' },
  ]);
  assert.equal(errors.length, 2);
});
