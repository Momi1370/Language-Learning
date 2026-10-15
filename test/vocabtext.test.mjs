import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formMatches, clozeOf } from '../js/vocabtext.js';

test('a form matches whole words only, ignoring case and punctuation', () => {
  assert.ok(formMatches('Stuff happens.', ['stuff']));
  assert.ok(formMatches("The budget's tight this month.", ['budget']));
  assert.ok(!formMatches('I love stuffing.', ['stuff']));
  assert.ok(!formMatches("It's a rebuff.", ['buff']));
});

test('… lets up to three words sit inside a phrasal verb', () => {
  const forms = ['figure … out'];
  assert.ok(formMatches("Let's figure it out together.", forms));
  assert.ok(formMatches('I figure out problems for a living.', forms));
  assert.ok(!formMatches('We figure one two three four out.', forms));
});

test('the cloze hides the word in the example and keeps the rest', () => {
  assert.equal(clozeOf('I left all my stuff in the car.', ['stuff']), 'I left all my ____ in the car.');
  assert.equal(clozeOf("Let's figure it out together.", ['figure … out']), "Let's ____ together.");
  assert.equal(clozeOf('Nothing matches here.', ['stuff']), null);
});

test('the cloze picks the earliest match, preferring the longer form', () => {
  assert.equal(clozeOf('Deal with it, and deal with that.', ['deal', 'deal with']), '____ it, and deal with that.');
});
