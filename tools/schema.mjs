const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const REGISTERS = ['informal', 'neutral', 'formal'];

export const MINIMUMS = {
  nl: { chunks: 25, speaking: 5, grammarItems: 15, limburg: 6, soundPairs: 6, dialogues: 2 },
  en: { chunks: 15, speaking: 5, soundPairs: 6 },
};

export function validateWeek(data, { lang, week }) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  if (!data || typeof data !== 'object') return ['file is not a JSON object'];
  const min = MINIMUMS[lang];
  if (!min) return [`unknown language "${lang}"`];
  if (data.lang !== lang) err(`lang must be "${lang}"`);
  if (data.week !== week) err(`week must be ${week}`);
  for (const key of ['theme', 'themeEn', 'mission']) if (!isText(data[key])) err(`${key} is required`);

  const s = data.sound;
  if (!s) err('sound is required');
  else {
    for (const key of ['id', 'title', 'explain', 'anchor']) if (!isText(s[key])) err(`sound.${key} is required`);
    if (!Array.isArray(s.pairs) || s.pairs.length < min.soundPairs) err(`sound.pairs needs at least ${min.soundPairs}`);
    else s.pairs.forEach((p, i) => {
      if (!Array.isArray(p) || p.length !== 2 || !isText(p[0]) || !isText(p[1])) err(`sound.pairs[${i}] must be two words`);
      else if (p[0].trim().toLowerCase() === p[1].trim().toLowerCase()) err(`sound.pairs[${i}] words must be spelled differently`);
    });
  }

  const prefix = `${lang}-${String(week).padStart(2, '0')}-`;
  const idPattern = new RegExp(`^${prefix}\\d{3}$`);
  const ids = new Set();
  if (!Array.isArray(data.chunks) || data.chunks.length < min.chunks) err(`chunks needs at least ${min.chunks}`);
  for (const [i, c] of (data.chunks ?? []).entries()) {
    const where = `chunks[${i}]`;
    if (!isText(c.id) || !idPattern.test(c.id)) err(`${where}.id must look like ${prefix}001`);
    else if (ids.has(c.id)) err(`${where}.id "${c.id}" is used twice`);
    else ids.add(c.id);
    if (!isText(c.text)) err(`${where}.text is required`);
    if (!isText(c.en)) err(`${where}.en is required`);
    if (lang === 'nl' && !('article' in c && [null, 'de', 'het'].includes(c.article))) err(`${where}.article must be "de", "het" or null`);
    if (lang === 'en' && 'article' in c) err(`${where}.article is only for Dutch`);
    if ('fa' in c && !isText(c.fa)) err(`${where}.fa must be text`);
    if ('register' in c && !REGISTERS.includes(c.register)) err(`${where}.register must be one of ${REGISTERS.join(', ')}`);
    if ('stress' in c && !(Array.isArray(c.stress) && c.stress.every(isText))) err(`${where}.stress must be a list of text`);
  }

  if (!Array.isArray(data.speaking) || data.speaking.length < min.speaking) err(`speaking needs at least ${min.speaking}`);
  for (const [i, p] of (data.speaking ?? []).entries()) {
    const where = `speaking[${i}]`;
    if (!isText(p.id)) err(`${where}.id is required`);
    if (!isText(p.prompt)) err(`${where}.prompt is required`);
    if (!Array.isArray(p.frames) || p.frames.length < 2 || !p.frames.every(isText)) err(`${where}.frames needs at least 2`);
    if (!isText(p.model)) err(`${where}.model is required`);
    if (!Number.isInteger(p.seconds) || p.seconds < 30 || p.seconds > 180) err(`${where}.seconds must be 30–180`);
  }

  const r = data.roleplay;
  if (!r || !isText(r.title) || !isText(r.prompt) || r.prompt.length < 100) err('roleplay needs a title and a prompt of at least 100 characters');

  if (lang === 'nl') {
    if (!Array.isArray(data.dialogues) || data.dialogues.length < min.dialogues) err(`dialogues needs at least ${min.dialogues}`);
    for (const [i, d] of (data.dialogues ?? []).entries()) {
      if (!isText(d.id) || !isText(d.title)) err(`dialogues[${i}] needs id and title`);
      if (!Array.isArray(d.lines) || d.lines.length < 8 || d.lines.length > 12) err(`dialogues[${i}] needs 8–12 lines`);
      for (const [k, l] of (d.lines ?? []).entries()) {
        if (!isText(l.speaker) || !isText(l.text) || !isText(l.en)) err(`dialogues[${i}].lines[${k}] needs speaker, text and en`);
      }
    }
    const g = data.grammar;
    if (!g || !isText(g.id) || !isText(g.title) || !isText(g.explain)) err('grammar needs id, title and explain');
    if (!g || !Array.isArray(g.items) || g.items.length < min.grammarItems) err(`grammar.items needs at least ${min.grammarItems}`);
    for (const [i, it] of (g?.items ?? []).entries()) {
      if (!isText(it.prompt) || !isText(it.answer)) err(`grammar.items[${i}] needs prompt and answer`);
    }
    if (!Array.isArray(data.limburg) || data.limburg.length < min.limburg) err(`limburg needs at least ${min.limburg}`);
    for (const [i, l] of (data.limburg ?? []).entries()) {
      if (!isText(l.standard) || !isText(l.everyday) || !isText(l.note)) err(`limburg[${i}] needs standard, everyday and note`);
      else if (/[()]/.test(l.standard)) err(`limburg[${i}].standard must be only the Dutch to say (put explanations in note)`);
    }
  }
  return errors;
}

export function validateWords(words) {
  if (!Array.isArray(words)) return ['words.json must be a list'];
  const errors = [];
  const ids = new Set();
  words.forEach((w, i) => {
    if (!/^w-\d{4}$/.test(w.id ?? '')) errors.push(`words[${i}].id must look like w-0001`);
    else if (ids.has(w.id)) errors.push(`words[${i}].id "${w.id}" is used twice`);
    else ids.add(w.id);
    if (!isText(w.text) || !isText(w.en)) errors.push(`words[${i}] needs text and en`);
    if (![null, 'de', 'het'].includes(w.article)) errors.push(`words[${i}].article must be "de", "het" or null`);
  });
  return errors;
}

// Words in a text, for level checks: punctuation and the "…" slot do not count.
export function countWords(text) {
  return String(text ?? '').replace(/[…?!.,:;"“”‘’()]/g, ' ').split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
}

// Dutch level floor (A2+), chosen by the learner on 2026-10-06 after week 1 felt too easy.
// Only real lesson files are checked (validate.mjs and the content tests), not test fixtures.
export const LEVEL = {
  nl: {
    maxChunkWords: 14, minAvgChunkWords: 6, maxShortChunks: 3, minLinkedChunks: 6,
    minAvgLineWords: 9, minSeconds: 90, minModelWords: 70, minAvgAnswerWords: 6,
  },
};
const LINK_WORDS = /\b(dus|maar|omdat|want|als|daarom|wanneer|terwijl|zodat|toen)\b/i;
const average = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

export function checkLevel(data) {
  const rules = LEVEL[data?.lang];
  if (!rules) return [];
  const errors = [];
  const chunks = data.chunks ?? [];
  const sizes = chunks.map((c) => countWords(c.text));
  sizes.forEach((n, i) => {
    if (n > rules.maxChunkWords) errors.push(`chunks[${i}] has ${n} words; at most ${rules.maxChunkWords}, so it can be said from memory`);
  });
  if (average(sizes) < rules.minAvgChunkWords) errors.push(`chunks average ${average(sizes).toFixed(1)} words; A2+ needs at least ${rules.minAvgChunkWords}`);
  const short = sizes.filter((n) => n <= 2).length;
  if (short > rules.maxShortChunks) errors.push(`${short} chunks have 1–2 words; at most ${rules.maxShortChunks} (keep only nouns whose de/het matters)`);
  const linked = chunks.filter((c) => LINK_WORDS.test(c.text)).length;
  if (linked < rules.minLinkedChunks) errors.push(`${linked} chunks join two ideas (dus, maar, omdat, want, als …); A2+ needs at least ${rules.minLinkedChunks}`);
  const lines = (data.dialogues ?? []).flatMap((d) => d.lines ?? []).map((l) => countWords(l.text));
  if (average(lines) < rules.minAvgLineWords) errors.push(`dialogue lines average ${average(lines).toFixed(1)} words; A2+ needs at least ${rules.minAvgLineWords}`);
  for (const [i, p] of (data.speaking ?? []).entries()) {
    if (p.seconds < rules.minSeconds) errors.push(`speaking[${i}].seconds is ${p.seconds}; A2+ answers last at least ${rules.minSeconds}`);
    const n = countWords(p.model);
    if (n < rules.minModelWords) errors.push(`speaking[${i}].model has ${n} words; a ${rules.minSeconds}-second model needs at least ${rules.minModelWords}`);
  }
  const answers = (data.grammar?.items ?? []).map((it) => countWords(it.answer));
  if (average(answers) < rules.minAvgAnswerWords) errors.push(`grammar answers average ${average(answers).toFixed(1)} words; A2+ needs at least ${rules.minAvgAnswerWords}`);
  return errors;
}

// A card text used twice (any week, same language) would become two cards reviewed separately.
export function findRepeats(weeks) {
  const seen = new Map();
  const errors = [];
  for (const w of weeks) {
    for (const c of w.chunks ?? []) {
      const key = `${w.lang}:${String(c.text).toLowerCase().replace(/[^\p{L}\d…]+/gu, ' ').trim()}`;
      if (seen.has(key)) errors.push(`${c.id} repeats ${seen.get(key)}: "${c.text}"`);
      else seen.set(key, c.id);
    }
  }
  return errors;
}

// A noun card teaches de/het by its colour: its article must match its text and the word list (keyed by the bare noun).
export function articleErrors(chunks, words) {
  const listed = new Map();
  for (const w of words ?? []) {
    const m = /^(de|het) (.+)$/.exec(w.text ?? '');
    if (m) listed.set(m[2], m[1]);
  }
  const errors = [];
  for (const c of chunks ?? []) {
    const noun = /^(de|het) ([\p{L}-]+)$/u.exec(c.text ?? '');
    if (!noun) continue;
    if (c.article !== noun[1]) errors.push(`${c.id} "${c.text}" needs article "${noun[1]}"`);
    const article = listed.get(noun[2]);
    if (article && article !== noun[1]) errors.push(`${c.id} "${c.text}": the word list says "${article} ${noun[2]}"`);
  }
  return errors;
}
