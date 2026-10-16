// Collects every text the app can speak, names each recording, and writes tools/tts/texts.json.
// Usage: node tools/tts/collect.mjs
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { clipKey, normalise } from '../../js/clips.js';

const root = new URL('../../', import.meta.url);
const readJson = async (rel) => JSON.parse(await readFile(new URL(rel, root), 'utf8'));
const list = async (dir, re) => (await readdir(new URL(dir, root)).catch(() => [])).filter((f) => re.test(f)).sort();

// The word buttons in the app say one word at a time.
export const wordsOf = (text) => text.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}'’-]/gu, '')).filter(Boolean);
// What the voice reads: the "…" gaps in sentence frames are left out.
export const spokenForm = (text) => normalise(text.replace(/\s*…\s*/g, ' ').replace(/\s+([,.?!;:])/g, '$1').replace(/^[,.\s]+/, ''));

function weekTexts(week) {
  const out = [];
  for (const c of week.chunks ?? []) out.push(c.text);
  for (const d of week.dialogues ?? []) for (const l of d.lines ?? []) out.push(l.text);
  for (const p of week.speaking ?? []) { out.push(...(p.frames ?? [])); if (p.model) out.push(p.model); }
  for (const it of week.grammar?.items ?? []) if (it.answer) out.push(it.answer);
  for (const pair of week.sound?.pairs ?? []) out.push(...pair);
  for (const p of week.limburg ?? []) if (p.standard) out.push(p.standard);
  return out;
}

export async function collect() {
  const result = { nl: new Map(), en: new Map() };
  const add = (lang, text, kind) => {
    const t = normalise(text);
    if (!t) return;
    const key = clipKey(lang, t);
    if (!result[lang].has(key)) result[lang].set(key, { key, text: t, say: spokenForm(t), kind });
  };
  for (const lang of ['nl', 'en']) {
    for (const f of await list(`content/${lang}/`, /^week-\d\d\.json$/)) {
      const texts = weekTexts(await readJson(`content/${lang}/${f}`));
      for (const t of texts) {
        add(lang, t, 'sentence');
        for (const w of wordsOf(t)) add(lang, w, 'word');
      }
    }
  }
  for (const f of await list('content/vocab/', /^pack-\d\d\.json$/)) {
    const pack = await readJson(`content/vocab/${f}`);
    for (const w of pack.words ?? []) {
      add('en', w.word, 'sentence');
      for (const e of w.examples ?? []) { add('en', e.text, 'sentence'); for (const x of wordsOf(e.text)) add('en', x, 'word'); }
    }
  }
  return { nl: [...result.nl.values()], en: [...result.en.values()] };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const texts = await collect();
  await writeFile(new URL('tools/tts/texts.json', root), `${JSON.stringify(texts, null, 1)}\n`);
  for (const lang of ['nl', 'en']) {
    const n = texts[lang].length;
    const sentences = texts[lang].filter((t) => t.kind === 'sentence').length;
    console.log(`${lang}: ${n} texts (${sentences} sentences, ${n - sentences} single words)`);
  }
}
