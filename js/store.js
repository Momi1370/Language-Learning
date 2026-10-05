import { TOTAL_WEEKS, SESSIONS_PER_WEEK } from './session.js';

export const STORAGE_KEY = 'taalmaatje.v1';

export function defaultState() {
  return {
    version: 1,
    position: { week: 1, session: 1 },
    done: [],
    history: [],
    settings: { farsi: true, voiceNl: '', voiceEn: '', extraWords: 0 },
    cards: {},
    myPhrases: [],
    ear: {},
    missions: {},
    extraFor: '',
    finished: false,
  };
}

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string';
const inRange = (n, max) => Number.isInteger(n) && n >= 1 && n <= max;
const isPosition = (p) => isObject(p) && inRange(p.week, TOTAL_WEEKS) && inRange(p.session, SESSIONS_PER_WEEK);

// Keeps every saved field that has the right shape and resets only the broken ones,
// so a damaged save or an odd backup can never stop the app from starting.
export function migrate(raw) {
  const base = defaultState();
  if (!isObject(raw) || raw.version !== 1) return base;
  const pick = (key, ok) => (ok(raw[key]) ? raw[key] : base[key]);
  const s = isObject(raw.settings) ? raw.settings : {};
  return {
    version: 1,
    position: pick('position', isPosition),
    done: pick('done', (v) => Array.isArray(v) && v.every(isText)),
    history: pick('history', (v) => Array.isArray(v) && v.every(isObject)),
    settings: {
      farsi: typeof s.farsi === 'boolean' ? s.farsi : base.settings.farsi,
      voiceNl: isText(s.voiceNl) ? s.voiceNl : base.settings.voiceNl,
      voiceEn: isText(s.voiceEn) ? s.voiceEn : base.settings.voiceEn,
      extraWords: Number.isInteger(s.extraWords) && s.extraWords >= 0 ? s.extraWords : base.settings.extraWords,
    },
    cards: pick('cards', isObject),
    myPhrases: pick('myPhrases', (v) => Array.isArray(v) && v.every((p) => isObject(p) && isText(p.id) && isText(p.text))),
    ear: pick('ear', isObject),
    missions: pick('missions', isObject),
    extraFor: pick('extraFor', isText),
    finished: pick('finished', (v) => typeof v === 'boolean'),
  };
}

export function createStore(storage) {
  let available = true;
  try {
    const probe = `${STORAGE_KEY}.probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
  } catch {
    available = false;
  }
  return {
    available,
    load() {
      if (!available) return defaultState();
      try { return migrate(JSON.parse(storage.getItem(STORAGE_KEY))); } catch { return defaultState(); }
    },
    save(state) {
      if (!available) return false;
      try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
    },
  };
}

export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToBlob(b64, type) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function buildExport(state, diaryEntries, now = new Date()) {
  const diary = [];
  for (const e of diaryEntries) diary.push({ id: e.id, date: e.date, type: e.blob.type, data: await blobToBase64(e.blob) });
  return JSON.stringify({ app: 'taalmaatje', version: 1, exportedAt: now.toISOString(), state, diary });
}

const NOT_BACKUP = 'This is not a Taalmaatje backup file.';

export function parseImport(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(NOT_BACKUP); }
  if (data?.app !== 'taalmaatje' || data.version !== 1 || !data.state || typeof data.state !== 'object') throw new Error(NOT_BACKUP);
  return {
    state: migrate(data.state),
    diary: (data.diary ?? []).map((e) => ({ id: e.id, date: e.date, blob: base64ToBlob(e.data, e.type) })),
  };
}
