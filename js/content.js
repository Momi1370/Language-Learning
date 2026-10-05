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

export async function loadCourse(week, fetchFn) {
  const weeks = [];
  for (let w = 1; w <= week; w++) {
    try {
      const [nl, en] = await Promise.all([loadWeek('nl', w, fetchFn), loadWeek('en', w, fetchFn)]);
      weeks.push(nl, en);
      if (w === week) return { nl, en, weeks, missing: false };
    } catch (e) {
      if (e instanceof ContentMissing && w === week) return { nl: null, en: null, weeks, missing: true };
      throw e;
    }
  }
  return { nl: null, en: null, weeks, missing: true };
}
