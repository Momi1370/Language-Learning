import { countWords } from './schema.mjs';
import { ipaSyllableCount, ipaStressedSyllables } from './ipa.mjs';
import { formMatches, TRACKS } from '../js/vocabtext.js';

export const MIN_PACK_WORDS = 100;
export const MIN_PACK_WORDS_NL = 10;
export const EXAMPLE_WORDS = { min: 5, max: 16 };
// Old-fashioned or stiff English that learners should not copy (spec §5). "Shall we …?" is still current.
export const DATED = [
  /\bwhom\b/i, /\bwhilst\b/i, /\b(?:i|you|he|she|it|we|they) shall\b/i, /\bought to\b/i, /\bupon\b/i,
  /\bthus\b/i, /\bperchance\b/i, /\bi dare say\b/i, /\bone must\b/i, /\bthou\b/i, /\bhenceforth\b/i,
];
const TENSES = ['past', 'present', 'future'];
const FUTURE = /(?:'ll|’ll|\bwill\b|\bwon't\b|\bgoing to\b)/i;
const FUTURE_NL = /\b(?:zal|zult|zullen|ga|gaat|gaan)\b/i;
const PAST_NL = /\b(?:heb|hebt|heeft|hebben|ben|bent|is|zijn|was|waren|had|hadden)\b/i;
const REGISTERS = ['informal', 'neutral', 'formal'];
const REGISTERS_NL = [...REGISTERS, 'Belgian', 'Netherlands'];
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isFarsi = (v) => isText(v) && /[؀-ۿ]/.test(v);

function respelling(stress) {
  const tokens = stress.join(' ').split(/[\s-]+/).filter(Boolean);
  const capitals = tokens.flatMap((t, i) => (/\p{Lu}/u.test(t) && t === t.toUpperCase() ? [i] : []));
  return { count: tokens.length, capitals };
}

export function validateVocab(pack, { minWords } = {}) {
  const errors = [];
  const err = (m) => errors.push(m);
  if (!pack || typeof pack !== 'object') return ['file is not a JSON object'];
  if (!Number.isInteger(pack.pack) || pack.pack < 1) err('pack must be a number from 1');
  const nl = pack.lang === 'nl';
  if ('lang' in pack && !['en', 'nl'].includes(pack.lang)) err('lang must be en or nl');
  if (nl && pack.format !== 2) err('a Dutch pack must be format 2');
  if (!TRACKS.includes(pack.track)) err(`track must be one of ${TRACKS.join(', ')}`);
  if (!isText(pack.source)) err('source is required (credit for the word list and the IPA)');
  if (!Array.isArray(pack.words)) return [...errors, 'words must be a list'];
  const min = minWords ?? (pack.draft === true ? 1 : nl ? MIN_PACK_WORDS_NL : MIN_PACK_WORDS);
  if (pack.words.length < min) err(`words needs at least ${min}`);

  const ids = new Set();
  pack.words.forEach((w, i) => {
    const where = `words[${i}] "${w?.word ?? ''}"`;
    const idShape = nl ? /^d-\d{4}$/ : /^v-\d{4}$/;
    if (!idShape.test(w?.id ?? '')) err(`${where}.id must look like ${nl ? 'd-0001' : 'v-0001'}`);
    else if (ids.has(w.id)) err(`${where}.id "${w.id}" is used twice`);
    else ids.add(w.id);
    if (!isText(w.word)) err(`${where}.word is required`);
    if (!isText(w.pos)) err(`${where}.pos is required`);
    if (!Array.isArray(w.forms) || !w.forms.length || !w.forms.every(isText)) err(`${where}.forms needs at least one spelling`);
    const registers = nl ? REGISTERS_NL : REGISTERS;
    if ('register' in w && !registers.includes(w.register)) err(`${where}.register must be one of ${registers.join(', ')}`);
    if (nl && !isText(w.en)) err(`${where}.en is required (a short English gloss)`);
    if (nl && String(w.pos).startsWith('noun') && !/^(?:de|het) \S/.test(w.word ?? '')) err(`${where}.word must start with de or het`);
    if (!isFarsi(w.fa?.meaning)) err(`${where}.fa.meaning must be Farsi text`);
    if (!isFarsi(w.fa?.note)) err(`${where}.fa.note must be Farsi text`);

    if (!isText(w.ipa)) err(`${where}.ipa is required (run tools/${nl ? 'vocab-ipa-nl' : 'vocab-ipa'}.mjs)`);
    if (!Array.isArray(w.stress) || !w.stress.length || !w.stress.every(isText)) err(`${where}.stress is required`);
    else if (nl) {
      if (!respelling(w.stress).capitals.length) err(`${where}.stress needs a capitalised part, like af-SPRAAK`);
    } else if (isText(w.ipa)) {
      const r = respelling(w.stress);
      const n = ipaSyllableCount(w.ipa);
      if (r.count !== n) err(`${where}.stress has ${r.count} syllables but ipa has ${n}`);
      else {
        const marked = ipaStressedSyllables(w.ipa);
        if (r.capitals.join() !== marked.join()) {
          err(`${where}.stress capitals (${r.capitals.map((x) => x + 1).join(',')}) must match the stressed syllables of the ipa (${marked.map((x) => x + 1).join(',')})`);
        }
      }
    }

    const format2 = pack.format === 2;
    if (format2) {
      if (!Array.isArray(w.morph) || w.morph.length < 2) err(`${where}.morph needs at least 2 word forms`);
      else w.morph.forEach((m, k) => { if (!Array.isArray(m) || m.length !== 2 || !m.every(isText)) err(`${where}.morph[${k}] must be [label, text]`); });
      const tenses = (w.examples ?? []).map((ex) => ex?.tense).sort().join();
      if (!Array.isArray(w.examples) || w.examples.length !== 3 || tenses !== [...TENSES].sort().join()) err(`${where}.examples needs one example each for past, present and future`);
    } else if (!Array.isArray(w.examples) || w.examples.length < 2 || w.examples.length > 3) err(`${where}.examples needs 2 or 3 examples`);
    (w.examples ?? []).forEach((ex, k) => {
      if (!isText(ex.text)) return err(`${where}.examples[${k}].text is required`);
      const n = countWords(ex.text);
      if (n < EXAMPLE_WORDS.min || n > EXAMPLE_WORDS.max) err(`${where}.examples[${k}] has ${n} words; use ${EXAMPLE_WORDS.min}–${EXAMPLE_WORDS.max}`);
      if (Array.isArray(w.forms) && !formMatches(ex.text, w.forms)) err(`${where}.examples[${k}] does not contain the word (check forms)`);
      for (const re of nl ? [] : DATED) {
        const m = re.exec(ex.text);
        if (m) err(`${where}.examples[${k}] uses old-fashioned English: "${m[0]}"`);
      }
      if (!isFarsi(ex.fa)) err(`${where}.examples[${k}].fa must be Farsi text`);
      if (format2) {
        if (!TENSES.includes(ex.tense)) err(`${where}.examples[${k}].tense must be past, present or future`);
        else if (ex.tense === 'future' && !(nl ? FUTURE_NL : FUTURE).test(ex.text)) err(`${where}.examples[${k}] future example needs ${nl ? 'zal, zult, zullen, ga, gaat or gaan' : "will, 'll or going to"}`);
        else if (nl && ex.tense === 'past' && !PAST_NL.test(ex.text)) err(`${where}.examples[${k}] past example needs a perfect or past form (heb … gemaakt, was, had …)`);
        if (!isFarsi(ex.grammar)) err(`${where}.examples[${k}].grammar must be Farsi text`);
      }
    });
  });
  return errors;
}

// The same id or the same word twice would become two cards for one thing.
export function findVocabRepeats(packs) {
  const ids = new Map();
  const words = new Map();
  const errors = [];
  for (const p of packs) {
    for (const w of p.words ?? []) {
      if (ids.has(w.id)) errors.push(`${w.id} is used twice`);
      ids.set(w.id, true);
      const key = String(w.word).toLowerCase().trim();
      if (words.has(key)) errors.push(`${w.id} repeats ${words.get(key)}: "${w.word}"`);
      else words.set(key, w.id);
    }
  }
  return errors;
}

// Words the English course weeks already teach as phrases are left out of the packs (spec §3).
export function courseOverlap(packs, enWeeks) {
  const errors = [];
  for (const p of packs) {
    for (const w of p.words ?? []) {
      for (const week of enWeeks) {
        for (const c of week.chunks ?? []) {
          if (formMatches(c.text, w.forms ?? [])) errors.push(`${w.id} "${w.word}" is already taught in ${c.id}`);
        }
      }
    }
  }
  return errors;
}
