import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVocab, findVocabRepeats, courseOverlap } from '../tools/vocab-schema.mjs';
import { validVocabPack, validVocabWord } from './fixtures.mjs';

const has = (errors, text) => errors.some((e) => e.includes(text));
const one = { minWords: 1 };
const pack = (change) => { const p = validVocabPack(); change(p.words[0], p); return validateVocab(p, one); };

test('a complete pack has no errors', () => assert.deepEqual(validateVocab(validVocabPack(), one), []));

test('a pack needs 100 words unless it is a draft', () => {
  assert.ok(has(validateVocab(validVocabPack()), 'words needs at least 100'));
  const draft = validVocabPack();
  draft.draft = true;
  assert.deepEqual(validateVocab(draft), []);
});

test('a missing source credit is reported', () => assert.ok(has(pack((w, p) => { delete p.source; }), 'source is required')));

test('one example is not enough and four are too many', () => {
  assert.ok(has(pack((w) => { w.examples.pop(); }), 'examples needs 2 or 3'));
  assert.ok(has(pack((w) => { w.examples.push(w.examples[0], w.examples[1]); }), 'examples needs 2 or 3'));
});

test('an example that does not contain the word is reported', () => {
  assert.ok(has(pack((w) => { w.examples[1].text = 'There is so much to do before the trip.'; }), 'examples[1] does not contain the word'));
});

test('an example that is too short or too long is reported', () => {
  assert.ok(has(pack((w) => { w.examples[0].text = 'My stuff.'; }), 'examples[0] has 2 words'));
  assert.ok(has(pack((w) => { w.examples[0].text = 'I left all my stuff in the car because the trunk was full and the weather was getting really quite bad.'; }), 'examples[0] has 21 words'));
});

test('old-fashioned phrasing in an example is reported', () => {
  assert.ok(has(pack((w) => { w.examples[0].text = 'Whilst I carry my stuff, you can lock the car.'; }), 'old-fashioned'));
  assert.ok(has(pack((w) => { w.examples[0].text = 'I shall take all my stuff to the car now.'; }), 'old-fashioned'));
  assert.deepEqual(pack((w) => { w.examples[0].text = 'Shall we take all my stuff to the car now?'; }), []);
});

test('Farsi is required for the meaning, the note and every translation', () => {
  assert.ok(has(pack((w) => { w.fa.meaning = 'things'; }), 'fa.meaning must be Farsi'));
  assert.ok(has(pack((w) => { w.fa.note = 'a note'; }), 'fa.note must be Farsi'));
  assert.ok(has(pack((w) => { w.examples[1].fa = 'translation'; }), 'examples[1].fa must be Farsi'));
});

test('IPA is required and the id must look like v-0001', () => {
  assert.ok(has(pack((w) => { delete w.ipa; }), 'ipa is required'));
  assert.ok(has(pack((w) => { w.id = 'w-1'; }), 'id must look like v-0001'));
});

test('the stress guide must have the IPA’s syllables and stressed syllable', () => {
  const set = (ipa, stress) => pack((w) => { w.ipa = ipa; w.stress = stress; });
  assert.deepEqual(set('ɹɪˈlaɪəbəl', ['ri-LY-uh-bul']), []);
  assert.ok(has(set('ɹɪˈlaɪəbəl', ['ri-LY-bul']), 'stress has 3 syllables but ipa has 4'));
  assert.ok(has(set('ɹɪˈlaɪəbəl', ['RI-ly-uh-bul']), 'capitals (1) must match'));
  assert.deepEqual(set('ˈdil wɪð', ['DEAL with']), []);
  assert.deepEqual(set('ˈfɪɡjɚ ˈaʊt', ['FIG-yer OUT']), []);
});

test('a register that is not informal, neutral or formal is reported', () => {
  assert.ok(has(pack((w) => { w.register = 'slangy'; }), 'register must be one of'));
});

test('a repeated id or a repeated word is reported across packs', () => {
  const a = validVocabPack();
  const b = validVocabPack();
  b.pack = 2;
  assert.ok(findVocabRepeats([a, b]).some((e) => e.includes('v-0001 is used twice')));
  b.words[0].id = 'v-0002';
  assert.deepEqual(findVocabRepeats([a, b]), ['v-0002 repeats v-0001: "stuff"']);
  b.words[0].word = 'Budget';
  assert.deepEqual(findVocabRepeats([a, b]), []);
});

test('a word already taught in an English week is reported', () => {
  const week = { lang: 'en', week: 2, chunks: [{ id: 'en-02-008', text: "Sorry, I didn't quite catch that." }] };
  const catchWord = { ...validVocabWord(5), word: 'catch', forms: ['catch', 'catches', 'caught', 'catching'] };
  assert.deepEqual(courseOverlap([{ pack: 1, words: [catchWord] }], [week]), ['v-0005 "catch" is already taught in en-02-008']);
  assert.deepEqual(courseOverlap([validVocabPack()], [week]), []);
});
