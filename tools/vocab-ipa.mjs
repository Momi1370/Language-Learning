// Fills the "ipa" field of a vocabulary pack from the CMU Pronouncing Dictionary.
// Usage: node tools/vocab-ipa.mjs content/vocab/pack-01.json /path/to/cmudict.dict
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseCmudict, ipaFor } from './ipa.mjs';

export function fillIpa(pack, dict, { force = false } = {}) {
  const missing = [];
  const words = pack.words.map((w) => {
    if (w.ipa && !force) return w;
    try { return { ...w, ipa: ipaFor(w.word, dict) }; } catch { missing.push(w.word); return w; }
  });
  return { pack: { ...pack, words }, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packPath, dictPath] = process.argv.slice(2);
  if (!packPath || !dictPath) {
    console.error('Usage: node tools/vocab-ipa.mjs <pack.json> <cmudict.dict>');
    process.exit(2);
  }
  const dict = parseCmudict(await readFile(dictPath, 'utf8'));
  const { pack, missing } = fillIpa(JSON.parse(await readFile(packPath, 'utf8')), dict);
  await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);
  if (missing.length) {
    console.error(`Not in the dictionary (pick another word): ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`IPA filled for ${pack.words.length} words`);
}
