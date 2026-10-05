import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickVoice, voicesFor, accentOf, canRecognise, canRecord } from '../js/speech.js';

const voices = [
  { name: 'Xander', lang: 'nl-NL' },
  { name: 'Ellen', lang: 'nl_BE' },
  { name: 'Samantha', lang: 'en-US' },
  { name: 'Daniel', lang: 'en-GB' },
];

test('Dutch prefers a Belgian voice, even with an underscore in the code', () => {
  assert.equal(pickVoice(voices, 'nl').name, 'Ellen');
});
test('a chosen voice wins when it exists', () => {
  assert.equal(pickVoice(voices, 'nl', 'Xander').name, 'Xander');
  assert.equal(pickVoice(voices, 'nl', 'Gone').name, 'Ellen');
});
test('English prefers British, then American', () => {
  assert.equal(pickVoice(voices, 'en').name, 'Daniel');
  assert.equal(pickVoice(voices.filter((v) => v.name !== 'Daniel'), 'en').name, 'Samantha');
});
test('no voice for a language gives null', () => assert.equal(pickVoice([], 'nl'), null));
test('voicesFor filters by language', () => assert.deepEqual(voicesFor(voices, 'nl').map((v) => v.name), ['Xander', 'Ellen']));
test('accentOf', () => {
  assert.equal(accentOf(voices[1]), 'be');
  assert.equal(accentOf(voices[0]), 'nl');
  assert.equal(accentOf(null), null);
});
test('in Node there is no recognition or recording', () => {
  assert.equal(canRecognise(), false);
  assert.equal(canRecord(), false);
});
