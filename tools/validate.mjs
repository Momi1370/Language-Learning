import { readFile, readdir } from 'node:fs/promises';
import { validateWeek, validateWords, checkLevel } from './schema.mjs';

const root = new URL('../content/', import.meta.url);
let failed = false;
const report = (file, errors) => {
  if (!errors.length) return console.log(`✓ ${file}`);
  failed = true;
  console.error(`✗ ${file}`);
  for (const e of errors) console.error(`   - ${e}`);
};

const seen = new Map();
for (const lang of ['nl', 'en']) {
  const dir = new URL(`${lang}/`, root);
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^week-\d\d\.json$/.test(f)).sort();
  for (const file of files) {
    const name = `${lang}/${file}`;
    let data;
    try { data = JSON.parse(await readFile(new URL(file, dir), 'utf8')); }
    catch (e) { report(name, [`invalid JSON: ${e.message}`]); continue; }
    const errors = validateWeek(data, { lang, week: Number(file.slice(5, 7)) });
    errors.push(...checkLevel(data));
    for (const c of data.chunks ?? []) {
      if (seen.has(c.id) && seen.get(c.id) !== name) errors.push(`chunk id ${c.id} is also used in ${seen.get(c.id)}`);
      seen.set(c.id, name);
    }
    report(name, errors);
  }
}

try { report('words.json', validateWords(JSON.parse(await readFile(new URL('words.json', root), 'utf8')))); }
catch (e) { report('words.json', [`cannot read: ${e.message}`]); }

process.exit(failed ? 1 : 0);
