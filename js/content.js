export class ContentMissing extends Error {}

const cache = new Map();

export function clearCache() {
  cache.clear();
}

export function weekUrl(lang, week) {
  return `content/${lang}/week-${String(week).padStart(2, '0')}.json`;
}

export async function loadJson(url, fetchFn = globalThis.fetch) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetchFn(url);
  if (res.status === 404) throw new ContentMissing(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

export const loadWeek = (lang, week, fetchFn) => loadJson(weekUrl(lang, week), fetchFn);
export const loadWords = (fetchFn) => loadJson('content/words.json', fetchFn);

// Never throws: a failure is reported in `error`, and the weeks that did load are kept
// so cards from earlier weeks still work.
export async function loadCourse(week, fetchFn) {
  const weeks = [];
  for (let w = 1; w <= week; w++) {
    try {
      const [nl, en] = await Promise.all([loadWeek('nl', w, fetchFn), loadWeek('en', w, fetchFn)]);
      weeks.push(nl, en);
      if (w === week) return { nl, en, weeks, missing: false, error: null };
    } catch (e) {
      if (e instanceof ContentMissing && w === week) return { nl: null, en: null, weeks, missing: true, error: null };
      return { nl: null, en: null, weeks, missing: false, error: e };
    }
  }
  return { nl: null, en: null, weeks, missing: true, error: null };
}

export const vocabUrl = (n) => `content/vocab/pack-${String(n).padStart(2, '0')}.json`;

// Loads pack-01, pack-02, … until the first one that does not exist. Never throws: a failure is
// reported in `error`, and the packs that did load are kept. Packs marked `draft` are skipped.
export async function loadVocab(fetchFn) {
  const packs = [];
  for (let n = 1; ; n++) {
    try {
      const pack = await loadJson(vocabUrl(n), fetchFn);
      if (!pack.draft) packs.push(pack);
    } catch (e) {
      return { packs, error: e instanceof ContentMissing ? null : e };
    }
  }
}
