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
export const clipPath = (lang, text) => `audio/${lang}/${clipKey(lang, text)}.mp3${version ? `?v=${version}` : ''}`;
export const MANIFEST_URL = 'audio/manifest.json';

let manifest = null; // { en: Set, nl: Set }
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
    const sets = {};
    for (const lang of ['en', 'nl']) sets[lang] = new Set(Array.isArray(data[lang]) ? data[lang].filter((k) => typeof k === 'string') : []);
    manifest = sets;
    version = typeof data.version === 'string' || typeof data.version === 'number' ? String(data.version) : '';
  } catch {
    manifest = null;
  }
}

export const hasClip = (lang, text) => Boolean(manifest?.[lang]?.has(clipKey(lang, text)));

export function stopClip() {
  if (audio) { try { audio.pause(); } catch { /* nothing playing */ } }
  finish?.(true);
}

// Plays the clip at the given speed. Resolves true when it played (or was replaced by a newer one) and
// false when it could not be played, so the caller can use the phone voice instead. The one Audio element
// is reused: on an iPhone it is unlocked by the first tap and may then play later clips.
export function playClip(lang, text, rate = 1, { AudioCtor = globalThis.Audio } = {}) {
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
    audio.src = clipPath(lang, text);
    audio.playbackRate = rate;
    audio.preservesPitch = true;
    audio.webkitPreservesPitch = true;
    Promise.resolve(audio.play()).catch(() => done(false));
  });
}
