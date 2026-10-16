import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords, checkLevel, findRepeats } from './schema.mjs';
import { validateVocab, findVocabRepeats, courseOverlap } from './vocab-schema.mjs';

const root = new URL('../content/', import.meta.url);
let failed = false;
const report = (file, errors) => {
  if (!errors.length) return console.log(`✓ ${file}`);
  failed = true;
  console.error(`✗ ${file}`);
  for (const e of errors) console.error(`   - ${e}`);
};

const seen = new Map();
const all = [];
for (const lang of ['nl', 'en']) {
  const dir = new URL(`${lang}/`, root);
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^week-\d\d\.json$/.test(f)).sort();
  for (const file of files) {
    const name = `${lang}/${file}`;
    let data;
    try { data = JSON.parse(await readFile(new URL(file, dir), 'utf8')); }
    catch (e) { report(name, [`invalid JSON: ${e.message}`]); continue; }
    all.push(data);
    const errors = validateWeek(data, { lang, week: Number(file.slice(5, 7)) });
    errors.push(...checkLevel(data));
    for (const c of data.chunks ?? []) {
      if (seen.has(c.id) && seen.get(c.id) !== name) errors.push(`chunk id ${c.id} is also used in ${seen.get(c.id)}`);
      seen.set(c.id, name);
    }
    report(name, errors);
  }
}

report('all weeks (repeated cards)', findRepeats(all));

try { report('words.json', validateWords(JSON.parse(await readFile(new URL('words.json', root), 'utf8')))); }
catch (e) { report('words.json', [`cannot read: ${e.message}`]); }

const vocabDir = new URL('vocab/', root);
const packs = [];
for (const file of (await readdir(vocabDir).catch(() => [])).filter((f) => /^pack-\d\d\.json$/.test(f)).sort()) {
  const name = `vocab/${file}`;
  let data;
  try { data = JSON.parse(await readFile(new URL(file, vocabDir), 'utf8')); }
  catch (e) { report(name, [`invalid JSON: ${e.message}`]); continue; }
  packs.push(data);
  const errors = validateVocab(data);
  if (data.pack !== Number(file.slice(5, 7))) errors.push(`pack must be ${Number(file.slice(5, 7))}`);
  report(name, errors);
}
report('vocabulary (repeated words)', findVocabRepeats(packs));
report('vocabulary (English words already in the English course)', courseOverlap(packs.filter((p) => p.lang !== 'nl'), all.filter((w) => w.lang === 'en')));
report('vocabulary (Dutch words already in the Dutch course)', courseOverlap(packs.filter((p) => p.lang === 'nl'), all.filter((w) => w.lang === 'nl')));

process.exit(failed ? 1 : 0);
