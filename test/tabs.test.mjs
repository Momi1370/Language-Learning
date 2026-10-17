import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tabOf, TABS } from '../js/tabs.js';

test('the bar has four tabs: Today, Words, Progress, Settings', () => {
  assert.deepEqual(TABS.map((t) => t.id), ['today', 'words', 'progress', 'settings']);
});

test('every screen belongs to one tab; both word languages and their lists belong to Words', () => {
  for (const r of ['words', 'words/list', 'woorden', 'woorden/list']) assert.equal(tabOf(r), 'words', r);
  for (const r of ['today', 'block/cards', 'block/sound', 'block/listen', 'block/speak', 'block/grammar', 'block/english', 'roleplay', '']) assert.equal(tabOf(r), 'today', r);
  assert.equal(tabOf('progress'), 'progress');
  assert.equal(tabOf('settings'), 'settings');
  assert.equal(tabOf('nonsense/page'), 'today');
});
