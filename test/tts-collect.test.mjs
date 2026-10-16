import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { collect } from '../tools/tts/collect.mjs';
import { clipKey, normalise } from '../js/clips.js';

const packs = [];
for (const f of (await readdir(new URL('../content/vocab/', import.meta.url))).filter((x) => /^pack-\d\d\.json$/.test(x)).sort()) {
  packs.push(JSON.parse(await readFile(new URL(`../content/vocab/${f}`, import.meta.url), 'utf8')));
}
const texts = await collect();
const keys = { en: new Set(texts.en.map((t) => t.key)), nl: new Set(texts.nl.map((t) => t.key)) };

test('every vocabulary word and example sentence is recorded in its own language', () => {
  for (const pack of packs) {
    const lang = pack.lang ?? 'en';
    const other = lang === 'nl' ? 'en' : 'nl';
    for (const w of pack.words) {
      for (const text of [w.word, ...w.examples.map((e) => e.text)]) {
        const key = clipKey(lang, normalise(text));
        assert.ok(keys[lang].has(key), `${lang} pack ${pack.pack}: "${text}" has no recording`);
        assert.ok(!keys[other].has(key) || lang === other, `"${text}" must not be recorded as ${other}`);
      }
    }
  }
});

test('the Dutch packs add Dutch texts: headwords with their article and single example words', () => {
  const dutch = packs.filter((p) => p.lang === 'nl');
  assert.ok(dutch.length >= 2);
  const say = new Set(texts.nl.map((t) => t.text));
  assert.ok(say.has('de huisarts'));
  assert.ok(say.has('huisarts'), 'a word of an example sentence is recorded on its own');
});
