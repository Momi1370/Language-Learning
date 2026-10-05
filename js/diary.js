const DB_NAME = 'taalmaatje';
const STORE = 'diary';

const byId = (a, b) => a.id.localeCompare(b.id);

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function memoryDiary() {
  const entries = new Map();
  return {
    persistent: false,
    async put(entry) { entries.set(entry.id, entry); },
    async get(id) { return entries.get(id) ?? null; },
    async all() { return [...entries.values()].sort(byId); },
    async clear() { entries.clear(); },
  };
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('IndexedDB did not answer')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Some browsers (private modes, headless) never answer open(); never block the app on it.
export async function openDiary(idb = globalThis.indexedDB, timeoutMs = 3000) {
  if (!idb) return memoryDiary();
  try {
    const open = idb.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' });
    const db = await withTimeout(promisify(open), timeoutMs);
    const store = (mode) => db.transaction(STORE, mode).objectStore(STORE);
    return {
      persistent: true,
      put: (entry) => promisify(store('readwrite').put(entry)),
      get: async (id) => (await promisify(store('readonly').get(id))) ?? null,
      all: async () => (await promisify(store('readonly').getAll())).sort(byId),
      clear: () => promisify(store('readwrite').clear()),
    };
  } catch {
    return memoryDiary();
  }
}
