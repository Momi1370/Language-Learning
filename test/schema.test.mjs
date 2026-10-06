import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWeek, validateWords, checkLevel, countWords } from '../tools/schema.mjs';
import { validNl, validEn, levelNl } from './fixtures.mjs';

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

test('countWords ignores punctuation and the … slot', () => {
  assert.equal(countWords('Kan je dat nog eens herhalen?'), 6);
  assert.equal(countWords('Ik woon in …'), 3);
  assert.equal(countWords('Wat bedoel je met ‘opvolgen’?'), 5);
});

test('a Dutch week at A2+ passes the level check', () => assert.deepEqual(checkLevel(levelNl()), []));

test('a Dutch week of two-word chunks is below A2+', () => {
  const errors = checkLevel(validNl());
  assert.ok(has(errors, 'chunks average'));
  assert.ok(has(errors, 'join two ideas'));
});

test('a chunk too long to say from memory is reported', () => {
  const w = levelNl();
  w.chunks[3].text = 'Ik werk vandaag thuis aan het project omdat de trein niet rijdt en het ook regent buiten.';
  assert.ok(has(checkLevel(w), 'chunks[3] has 17 words'));
});

test('more than three one- or two-word chunks is reported', () => {
  const w = levelNl();
  for (const i of [10, 11, 12, 13]) w.chunks[i].text = 'de vergadering';
  assert.ok(has(checkLevel(w), '4 chunks have 1–2 words'));
});

test('a 60-second speaking task or a short model answer is reported', () => {
  const w = levelNl();
  w.speaking[0].seconds = 60;
  w.speaking[1].model = 'Ik ben Amir.';
  const errors = checkLevel(w);
  assert.ok(has(errors, 'speaking[0].seconds is 60'));
  assert.ok(has(errors, 'speaking[1].model has 3 words'));
});

test('short dialogue lines and short grammar answers are reported', () => {
  const w = levelNl();
  for (const d of w.dialogues) for (const l of d.lines) l.text = 'Ja, goed.';
  for (const it of w.grammar.items) it.answer = 'Ik werk.';
  const errors = checkLevel(w);
  assert.ok(has(errors, 'dialogue lines average 2.0'));
  assert.ok(has(errors, 'grammar answers average 2.0'));
});

test('English weeks have no Dutch level floor', () => assert.deepEqual(checkLevel(validEn()), []));
