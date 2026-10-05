// Usage: node tools/import-woorden.mjs <path to woorden/index.html>
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

export function extractSeed(html) {
  const at = html.indexOf('const SEED');
  if (at < 0) throw new Error('SEED list not found');
  const start = html.indexOf('[', at);
  let depth = 0;
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) {
      // JSON round trip: values built inside the vm belong to another realm.
      return JSON.parse(JSON.stringify(vm.runInNewContext(`(${html.slice(start, i + 1)})`)));
    }
  }
  throw new Error('SEED list is not closed');
}

export function toWords(seed) {
  return seed.map(([text, article, , en, pos, example], i) => ({
    id: `w-${String(i + 1).padStart(4, '0')}`,
    text,
    article: article ?? null,
    en,
    pos,
    example,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const words = toWords(extractSeed(await readFile(process.argv[2], 'utf8')));
  const out = '[\n' + words.map((w) => JSON.stringify(w)).join(',\n') + '\n]\n';
  await writeFile(new URL('../content/words.json', import.meta.url), out);
  console.log(`wrote ${words.length} words`);
}
