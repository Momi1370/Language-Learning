import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, nextPosition, blockLabel, streak, part, diaryId, BLOCKS } from '../js/session.js';
import { validNl, validEn } from './fixtures.mjs';

const nl = validNl();
const en = validEn();
const s = (session) => buildSession({ week: 1, session }, nl, en);

test('part splits a list evenly and covers every item once', () => {
  const list = Array.from({ length: 26 }, (_, i) => i);
  const parts = [0, 1, 2, 3, 4].map((i) => part(list, i, 5));
  assert.deepEqual(parts.flat(), list);
  assert.ok(parts.every((p) => p.length === 5 || p.length === 6));
});

test('session 1: first half of dialogue A, prompt 1, grammar intro, mission shown', () => {
  const x = s(1);
  assert.equal(x.nl.shadow.id, 'nl-01-d0');
  assert.equal(x.nl.shadow.lines.length, 4);
  assert.equal(x.nl.speak.id, 'nl-01-s1');
  assert.equal(x.nl.diary, null);
  assert.equal(x.nl.limburg, null);
  assert.equal(x.nl.grammar.intro, true);
  assert.equal(x.nl.grammar.items.length, 4);
  assert.equal(x.nl.mission.show, true);
  assert.equal(x.nl.sound.intro, true);
  assert.equal(x.nl.roleplay, null);
});

test('sessions 2–4 use the right dialogue part', () => {
  assert.equal(s(2).nl.shadow.lines.length, 8);
  assert.equal(s(3).nl.shadow.id, 'nl-01-d1');
  assert.equal(s(3).nl.shadow.lines.length, 4);
  assert.equal(s(4).nl.shadow.lines.length, 8);
});

test('session 5: Limburg ear, diaries, grammar review, role-plays, mission check', () => {
  const x = s(5);
  assert.equal(x.last, true);
  assert.equal(x.nl.shadow, null);
  assert.equal(x.nl.limburg.length, 6);
  assert.equal(x.nl.speak, null);
  assert.equal(x.nl.diary.diaryId, 'nl-01');
  assert.equal(x.nl.diary.id, 'nl-01-s5');
  assert.equal(x.en.diary.diaryId, 'en-01');
  assert.equal(x.nl.grammar.review, true);
  assert.equal(x.nl.grammar.items.length, 5);
  assert.ok(x.nl.roleplay && x.en.roleplay);
  assert.equal(x.nl.mission.check, true);
});

test('every chunk is introduced exactly once over the week', () => {
  const nlIds = [1, 2, 3, 4, 5].flatMap((n) => s(n).nl.newCards);
  const enIds = [1, 2, 3, 4, 5].flatMap((n) => s(n).en.newCards);
  assert.deepEqual(nlIds, nl.chunks.map((c) => c.id));
  assert.deepEqual(enIds, en.chunks.map((c) => c.id));
});

test('every grammar item is practised once in sessions 1–4', () => {
  const items = [1, 2, 3, 4].flatMap((n) => s(n).nl.grammar.items);
  assert.deepEqual(items, nl.grammar.items);
});

test('every sound pair is said once over the week', () => {
  assert.deepEqual([1, 2, 3, 4, 5].flatMap((n) => s(n).nl.sound.sayPairs), nl.sound.pairs);
});

test('nextPosition moves through sessions, weeks and stops at the end', () => {
  assert.deepEqual(nextPosition({ week: 1, session: 1 }), { week: 1, session: 2 });
  assert.deepEqual(nextPosition({ week: 1, session: 5 }), { week: 2, session: 1 });
  assert.equal(nextPosition({ week: 12, session: 5 }), null);
});

test('blockLabel: listen block is Limburg ear and speak is the diary in session 5', () => {
  assert.equal(blockLabel('listen', s(5)).title, 'Limburg ear');
  assert.equal(blockLabel('speak', s(5)).title, 'Speaking diary');
  assert.equal(BLOCKS.reduce((sum, b) => sum + blockLabel(b, s(1)).minutes, 0), 37);
});

test('diaryId pads the week', () => assert.equal(diaryId('en', 3), 'en-03'));

// 2026-10-05 is a Monday.
const at = (d) => new Date(`${d}T12:00:00`);
const h = (...dates) => dates.map((date) => ({ date, week: 1, session: 1 }));

test('streak: empty history is 0', () => assert.equal(streak([], at('2026-10-05')), 0));
test('streak: today counts', () => assert.equal(streak(h('2026-10-05'), at('2026-10-05')), 1));
test('streak: a weekend does not break it', () => {
  assert.equal(streak(h('2026-10-01', '2026-10-02', '2026-10-05'), at('2026-10-05')), 3);
});
test('streak: today not done yet does not break it', () => {
  assert.equal(streak(h('2026-10-02'), at('2026-10-05')), 1);
});
test('streak: a missed weekday breaks it', () => {
  assert.equal(streak(h('2026-09-30', '2026-10-02'), at('2026-10-02')), 1);
});
test('streak: two sessions on one day count as one day', () => {
  assert.equal(streak(h('2026-10-05', '2026-10-05'), at('2026-10-05')), 1);
});
