import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords } from '../tools/schema.mjs';

const read = async (p) => JSON.parse(await readFile(new URL(`../content/${p}`, import.meta.url), 'utf8'));

for (const lang of ['nl', 'en']) {
  test(`every ${lang} week file is valid`, async () => {
    const files = (await readdir(new URL(`../content/${lang}/`, import.meta.url))).filter((f) => /^week-\d\d\.json$/.test(f));
    assert.ok(files.length >= 1, 'at least week 1 exists');
    for (const f of files) assert.deepEqual(validateWeek(await read(`${lang}/${f}`), { lang, week: Number(f.slice(5, 7)) }), [], f);
  });
}

test('words.json is valid and has 1946 words', async () => {
  const words = await read('words.json');
  assert.deepEqual(validateWords(words), []);
  assert.equal(words.length, 1946);
});

test('every Limburg form in week files is listed in SOURCES.md', async () => {
  const sources = await readFile(new URL('../content/SOURCES.md', import.meta.url), 'utf8');
  const files = (await readdir(new URL('../content/nl/', import.meta.url))).filter((f) => f.endsWith('.json'));
  for (const f of files) for (const l of (await read(`nl/${f}`)).limburg) assert.ok(sources.includes(l.everyday), `${l.everyday} has no source`);
});
