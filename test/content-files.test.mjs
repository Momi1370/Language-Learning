import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords, checkLevel, findRepeats, articleErrors } from '../tools/schema.mjs';

const read = async (p) => JSON.parse(await readFile(new URL(`../content/${p}`, import.meta.url), 'utf8'));
const weekFiles = async (lang) =>
  (await readdir(new URL(`../content/${lang}/`, import.meta.url))).filter((f) => /^week-\d\d\.json$/.test(f)).sort();

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

test('every Dutch week meets the A2+ level floor', async () => {
  for (const f of await weekFiles('nl')) assert.deepEqual(checkLevel(await read(`nl/${f}`)), [], f);
});

test('a noun card has the article it shows, matching the word list', async () => {
  const words = await read('words.json');
  for (const f of await weekFiles('nl')) assert.deepEqual(articleErrors((await read(`nl/${f}`)).chunks, words), [], f);
});

test('every Limburg pair shows two different forms', async () => {
  for (const f of await weekFiles('nl')) {
    for (const l of (await read(`nl/${f}`)).limburg) assert.notEqual(l.standard.trim(), l.everyday.trim(), `${f}: "${l.standard}" is the same on both sides`);
  }
});

test('Dutch role-play prompts ask for A2+ Dutch, the level the learner chose', async () => {
  for (const f of await weekFiles('nl')) assert.match((await read(`nl/${f}`)).roleplay.prompt, /A2\+/, f);
});

test('no sentence is taught as a card twice', async () => {
  const weeks = [];
  for (const lang of ['nl', 'en']) for (const f of await weekFiles(lang)) weeks.push(await read(`${lang}/${f}`));
  assert.deepEqual(findRepeats(weeks), []);
});

test('Dutch says ‘deze namiddag’, not ‘vanmiddag’ (in Belgium ‘middag’ is around noon)', async () => {
  for (const f of await weekFiles('nl')) {
    const w = await read(`nl/${f}`);
    const dutch = [
      ...w.chunks.map((c) => c.text),
      ...w.dialogues.flatMap((d) => d.lines.map((l) => l.text)),
      ...w.speaking.flatMap((p) => [p.prompt, p.model, ...p.frames]),
      ...w.grammar.items.flatMap((it) => [it.prompt, it.answer]),
    ];
    for (const t of dutch) assert.doesNotMatch(t, /\bvanmiddag\b/i, `${f}: "${t}"`);
  }
});
