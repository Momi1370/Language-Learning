import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVocab, findVocabRepeats, courseOverlap } from '../tools/vocab-schema.mjs';
import { validVocabPack, validVocabWord, validVocabPack2, validDutchPack, validDutchWord } from './fixtures.mjs';

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

test('every pack belongs to the everyday or the university section', () => {
  assert.ok(has(pack((w, p) => { delete p.track; }), 'track must be'));
  assert.ok(has(pack((w, p) => { p.track = 'sports'; }), 'track must be'));
  assert.deepEqual(pack((w, p) => { p.track = 'university'; }), []);
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

const pack2 = (change) => { const p = validVocabPack2(); change(p.words[0], p); return validateVocab(p, one); };

test('a complete format-2 pack has no errors', () => assert.deepEqual(validateVocab(validVocabPack2(), one), []));

test('format 2 needs exactly one past, one present and one future example', () => {
  assert.ok(has(pack2((w) => { w.examples.pop(); }), 'one example each for past, present and future'));
  assert.ok(has(pack2((w) => { w.examples[1].tense = 'past'; }), 'one example each for past, present and future'));
  assert.ok(has(pack2((w) => { w.examples[0].tense = 'perfect'; }), 'tense must be past, present or future'));
});

test('format 2: the future example must use will, \'ll or going to', () => {
  assert.ok(has(pack2((w) => { w.examples[2].text = 'I move my stuff tomorrow morning.'; }), 'future example needs will'));
  assert.deepEqual(pack2((w) => { w.examples[2].text = "I'll move my stuff tomorrow."; }), []);
  assert.deepEqual(pack2((w) => { w.examples[2].text = 'I am going to move my stuff tomorrow.'; }), []);
});

test('format 2 needs word forms and a Farsi grammar note on every example', () => {
  assert.ok(has(pack2((w) => { delete w.morph; }), 'morph needs at least 2 word forms'));
  assert.ok(has(pack2((w) => { w.morph = [['Singular', 'stuff'], ['Plural']]; }), 'morph[1] must be [label, text]'));
  assert.ok(has(pack2((w) => { delete w.examples[1].grammar; }), 'examples[1].grammar must be Farsi text'));
  assert.ok(has(pack2((w) => { w.examples[0].grammar = 'past simple'; }), 'examples[0].grammar must be Farsi text'));
});

test('format 1 packs still need no forms or tenses', () => assert.deepEqual(validateVocab(validVocabPack(), one), []));

const nl = (change) => { const p = validDutchPack(); change(p.words[0], p); return validateVocab(p, one); };

test('a complete Dutch pack has no errors, and needs 10 words unless it is a draft', () => {
  assert.deepEqual(validateVocab(validDutchPack(), one), []);
  assert.ok(has(validateVocab(validDutchPack()), 'words needs at least 10'));
});

test('Dutch words have ids like d-0001, an English gloss and an article on nouns', () => {
  assert.ok(has(nl((w) => { w.id = 'v-0001'; }), 'd-0001'));
  assert.ok(has(nl((w) => { delete w.en; }), '.en is required'));
  assert.ok(has(nl((w) => { w.word = 'afspraak'; }), 'must start with de or het'));
  assert.deepEqual(nl((w) => { w.pos = 'verb'; w.word = 'bellen'; }), []);
});

test('a Dutch pack must be format 2 with three tenses, each with a Farsi grammar note', () => {
  assert.ok(has(nl((w, p) => { p.format = 1; }), 'format 2'));
  assert.ok(has(nl((w) => { w.examples.pop(); }), 'one example each for past, present and future'));
  assert.ok(has(nl((w) => { w.examples[0].grammar = 'english only'; }), 'grammar must be Farsi'));
  assert.ok(has(nl((w) => { w.morph = [['Plural', 'de afspraken']]; }), 'morph needs at least 2'));
});

test('the Dutch future example needs zal, zult, zullen, ga, gaat or gaan', () => {
  assert.ok(has(nl((w) => { w.examples[2].text = 'Volgende week maak ik een nieuwe afspraak.'; }), 'future example needs'));
  assert.deepEqual(nl((w) => { w.examples[2].text = 'Volgende week ga ik een afspraak maken.'; }), []);
});

test('the Dutch past example needs a perfect or past form', () => {
  assert.ok(has(nl((w) => { w.examples[0].text = 'Morgen maak ik een afspraak met de huisarts.'; }), 'past example needs'));
});

test('Dutch examples contain the word, are 5 to 16 words long and never reuse English checks', () => {
  assert.ok(has(nl((w) => { w.examples[1].text = 'Ik heb morgen een vergadering bij de tandarts.'; }), 'does not contain the word'));
  assert.ok(has(nl((w) => { w.examples[1].text = 'Een afspraak maken.'; }), 'words; use 5'));
  assert.deepEqual(nl((w) => { w.examples[1].text = 'Ik heb morgen upon een afspraak bij de tandarts.'; }), []);
});

test('Dutch register may be Belgian or Netherlands; the stress respelling needs a stressed part', () => {
  assert.deepEqual(nl((w) => { w.register = 'Belgian'; }), []);
  assert.ok(has(nl((w) => { w.register = 'slang'; }), 'register must be one of'));
  assert.ok(has(nl((w) => { w.stress = ['af-spraak']; }), 'stress needs a capitalised part'));
});

test('a pack language other than English or Dutch is reported', () => {
  assert.ok(has(nl((w, p) => { p.lang = 'fr'; }), 'lang must be'));
});

test('findVocabRepeats finds the same Dutch word in two packs', () => {
  const a = validDutchPack();
  const b = { ...validDutchPack(), pack: 5 };
  assert.ok(findVocabRepeats([a, b]).length > 0);
});

test('courseOverlap flags a Dutch word that a Dutch course chunk already uses', () => {
  const weeks = [{ lang: 'nl', chunks: [{ id: 'nl-01-001', text: 'Ik heb een afspraak om negen uur.' }] }, { lang: 'en', chunks: [] }];
  const errors = courseOverlap([validDutchPack()], weeks);
  assert.ok(has(errors, 'is already taught in nl-01-001'));
});
