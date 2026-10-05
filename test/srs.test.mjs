import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newCard, review, isDue, isLearned, Grade } from '../js/srs.js';

const now = new Date('2026-10-05T10:00:00Z');

test('a new card is due immediately and not learned', () => {
  const c = newCard(now);
  assert.equal(isDue(c, now), true);
  assert.equal(isLearned(c), false);
});

test('cards are plain JSON (dates are strings)', () => {
  const c = newCard(now);
  assert.equal(typeof c.due, 'string');
  assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
});

test('Good moves the due date into the future and marks the card learned', () => {
  const c = review(newCard(now), Grade.Good, now);
  assert.ok(new Date(c.due) > now);
  assert.equal(isLearned(c), true);
});

test('after two Good reviews the card is not due now but is due next year', () => {
  let c = review(newCard(now), Grade.Good, now);
  c = review(c, Grade.Good, new Date(c.due));
  assert.equal(isDue(c, now), false);
  assert.equal(isDue(c, new Date('2027-10-05T00:00:00Z')), true);
});

test('Again keeps the card due within one day', () => {
  const c = review(newCard(now), Grade.Again, now);
  assert.ok(new Date(c.due) - now < 24 * 3600 * 1000);
});
