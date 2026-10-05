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

export function migrate(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return base;
  return { ...base, ...raw, settings: { ...base.settings, ...(raw.settings ?? {}) } };
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
