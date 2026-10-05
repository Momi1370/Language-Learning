import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSeed, toWords } from '../tools/import-woorden.mjs';

const html = `<script>
const SEED = [
  ["de afspraak","de","встреча","appointment","zn","Ik heb een afspraak [morgen]."],
  ["bespreken",null,"обсуждать","to discuss","ww","We bespreken het.",{vt:"besprak"}]
];
const OTHER = [1];
</script>`;

test('extractSeed reads the SEED list, even with brackets inside strings', () => {
  const seed = extractSeed(html);
  assert.equal(seed.length, 2);
  assert.equal(seed[0][5], 'Ik heb een afspraak [morgen].');
});

test('toWords keeps Dutch, article, English, part of speech and example; drops Russian', () => {
  assert.deepEqual(toWords(extractSeed(html)), [
    { id: 'w-0001', text: 'de afspraak', article: 'de', en: 'appointment', pos: 'zn', example: 'Ik heb een afspraak [morgen].' },
    { id: 'w-0002', text: 'bespreken', article: null, en: 'to discuss', pos: 'ww', example: 'We bespreken het.' },
  ]);
});

test('extractSeed fails clearly when there is no SEED', () => {
  assert.throws(() => extractSeed('<p>nothing</p>'), /SEED list not found/);
});
