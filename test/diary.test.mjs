import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDiary } from '../js/diary.js';

test('without IndexedDB the diary works in memory and says it is not persistent', async () => {
  const d = await openDiary(undefined);
  assert.equal(d.persistent, false);
  await d.put({ id: 'nl-02', date: 'b', blob: new Blob(['2']) });
  await d.put({ id: 'nl-01', date: 'a', blob: new Blob(['1']) });
  assert.deepEqual((await d.all()).map((e) => e.id), ['nl-01', 'nl-02']);
  assert.equal((await d.get('nl-01')).date, 'a');
  assert.equal(await d.get('nope'), null);
  await d.clear();
  assert.deepEqual(await d.all(), []);
});
