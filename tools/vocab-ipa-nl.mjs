// Fills the "ipa" field of a Dutch vocabulary pack from espeak-ng's Dutch phonemes. Only a first draft:
// check every word by ear and by the "stress" respelling, and hand-set "ipa" where espeak is wrong (it is kept).
// Usage: node tools/vocab-ipa-nl.mjs content/vocab/pack-04.json   (needs espeak-ng in the PATH)
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const cleanEspeakIpa = (raw) => raw.replace(/[\r\n]+/g, ' ').replace(/[._‍]/g, '').replace(/\s+/g, ' ').trim();

const VOWELS = 'aɑeɛəɪiɔoøœyʏuʊɵʌɐæɜɒ';
const ONSETS = new Set('pl bl kl gl fl sl pr br tr dr kr gr fr xr ʋr sp st sk sx sn sm sf tʋ kʋ zʋ spr str skr spl skl'.split(' '));
const isOnset = (run) => (run.length === 1 ? run !== 'ŋ' : ONSETS.has(run));

// espeak writes the stress mark inside the syllable (hˈœyz…); IPA puts it before the syllable (ˈhœyz…).
export function moveStressMarks(ipa) {
  const chars = [...ipa];
  const out = [];
  for (const ch of chars) {
    if (ch !== 'ˈ' && ch !== 'ˌ') { out.push(ch); continue; }
    let start = out.length;
    while (start > 0 && !VOWELS.includes(out[start - 1]) && !/[\sˈˌː.]/.test(out[start - 1])) start--;
    let at = out.length;
    for (let i = start; i < out.length; i++) if (isOnset(out.slice(i).join(''))) { at = i; break; }
    out.splice(at, 0, ch);
  }
  return out.join('');
}

const speakWithEspeak = (text) => execFileSync('espeak-ng', ['-v', 'nl', '-q', '--ipa=3', text], { encoding: 'utf8' });

export function fillIpaNl(pack, speak = speakWithEspeak, { force = false } = {}) {
  const missing = [];
  const words = pack.words.map((w) => {
    if (w.ipa && !force) return w;
    const ipa = moveStressMarks(cleanEspeakIpa(speak(w.word.replace(/^(?:de|het) /, ''))));
    if (!ipa) { missing.push(w.word); return w; }
    return { ...w, ipa };
  });
  return { pack: { ...pack, words }, missing };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [packPath] = process.argv.slice(2);
  if (!packPath) {
    console.error('Usage: node tools/vocab-ipa-nl.mjs <pack.json>');
    process.exit(2);
  }
  const { pack, missing } = fillIpaNl(JSON.parse(await readFile(packPath, 'utf8')));
  await writeFile(packPath, `${JSON.stringify(pack, null, 2)}\n`);
  if (missing.length) {
    console.error(`espeak gave nothing for: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`IPA filled for ${pack.words.length} words`);
}
