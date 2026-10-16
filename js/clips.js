// Recorded voice clips (audio/<lang>/<key>.mp3), made ahead of time by tools/tts. A clip is used when the manifest
// lists it; everything else falls back to the phone's own voice (see speak() in speech.js).

// cyrb53: a small, fast 53-bit string hash. The tools in tools/tts use this same function to name the files.
function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export const normalise = (text) => String(text).replace(/\s+/g, ' ').trim();
export const clipKey = (lang, text) => cyrb53(`${lang}|${normalise(text)}`).toString(36).padStart(11, '0');
let version = '';
// The manifest's version is part of the address: a new set of recordings is never mistaken for the cached old one.
export const clipPath = (lang, voice, text) => `audio/${lang}/${voice}/${clipKey(lang, text)}.mp3${version ? `?v=${version}` : ''}`;
export const MANIFEST_URL = 'audio/manifest.json';

let manifest = null; // { voices: { en: [id, …], nl: [...] }, clips: { en: { id: Set }, nl: {...} } }
let audio = null;
let finish = null;

export function resetClips() {
  stopClip();
  manifest = null;
  audio = null;
  version = '';
}

// Never throws: with no manifest there are simply no clips.
export async function loadManifest(fetchFn = globalThis.fetch) {
  manifest = null;
  try {
    const res = await fetchFn(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data !== 'object') return;
    const next = { voices: {}, clips: {} };
    for (const lang of ['en', 'nl']) {
      const ids = Array.isArray(data.voices?.[lang]) ? data.voices[lang].filter((v) => typeof v === 'string') : [];
      next.voices[lang] = ids;
      next.clips[lang] = {};
      for (const id of ids) {
        const keys = data[lang]?.[id];
        next.clips[lang][id] = new Set(Array.isArray(keys) ? keys.filter((k) => typeof k === 'string') : []);
      }
    }
    manifest = next;
    version = typeof data.version === 'string' || typeof data.version === 'number' ? String(data.version) : '';
  } catch {
    manifest = null;
  }
}

export const voicesOf = (lang) => manifest?.voices[lang] ?? [];

// Which voice says this text? A speaker `slot` (0, 1: the two people of a dialogue) wins, then the learner's
// chosen voice, then "mixed": a fixed voice per text, so the same sentence always sounds the same.
// A voice without a recording of the text is skipped; null means no recording at all.
export function pickClip(lang, text, { slot, prefer = 'mixed' } = {}) {
  const ids = voicesOf(lang);
  if (!ids.length) return null;
  const key = clipKey(lang, text);
  const has = (id) => manifest.clips[lang][id]?.has(key);
  let want;
  if (Number.isInteger(slot)) want = ids[slot % ids.length];
  else if (ids.includes(prefer)) want = prefer;
  else want = ids[key.charCodeAt(key.length - 1) % ids.length];
  if (has(want)) return want;
  return ids.find(has) ?? null;
}

export const hasClip = (lang, text) => pickClip(lang, text) !== null;

export function stopClip() {
  if (audio) { try { audio.pause(); } catch { /* nothing playing */ } }
  finish?.(true);
}

// Plays the clip at the given speed. Resolves true when it played (or was replaced by a newer one) and
// false when it could not be played, so the caller can use the phone voice instead. The one Audio element
// is reused: on an iPhone it is unlocked by the first tap and may then play later clips.
export function playClip(lang, voice, text, rate = 1, { AudioCtor = globalThis.Audio } = {}) {
  if (!AudioCtor) return Promise.resolve(false);
  audio ??= new AudioCtor();
  finish?.(true);
  return new Promise((resolve) => {
    const limit = setTimeout(() => done(true), 60000);
    const done = (ok) => {
      clearTimeout(limit);
      if (finish === done) finish = null;
      resolve(ok);
    };
    finish = done;
    audio.onended = () => done(true);
    audio.onerror = () => done(false);
    audio.src = clipPath(lang, voice, text);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    audio.webkitPreservesPitch = true;
    Promise.resolve(audio.play()).catch(() => done(false));
  });
}
