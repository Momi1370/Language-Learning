const CACHE = 'taalmaatje-v2';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'vendor/ts-fsrs.mjs',
  'js/app.js',
  'js/cards.js',
  'js/clips.js',
  'js/content.js',
  'js/diary.js',
  'js/match.js',
  'js/session.js',
  'js/speech.js',
  'js/srs.js',
  'js/store.js',
  'js/vocabtext.js',
  'js/vocab.js',
  'js/learned.js',
  'js/tabs.js',
  'js/ui/cards.js',
  'js/ui/dom.js',
  'js/ui/english.js',
  'js/ui/grammar.js',
  'js/ui/limburg.js',
  'js/ui/progress.js',
  'js/ui/roleplay.js',
  'js/ui/settings.js',
  'js/ui/audiocheck.js',
  'js/ui/shadow.js',
  'js/ui/sound.js',
  'js/ui/speak.js',
  'js/ui/today.js',
  'js/ui/words.js',
  'js/ui/tracking.js',
  'js/ui/widgets.js',
  'content/words.json',
  'content/nl/week-01.json',
  'content/en/week-01.json',
  'content/nl/week-02.json',
  'content/en/week-02.json',
  'content/nl/week-03.json',
  'content/en/week-03.json',
  'content/nl/week-04.json',
  'content/en/week-04.json',
  'content/vocab/pack-01.json',
  'content/vocab/pack-02.json',
  'content/vocab/pack-03.json',
  'content/vocab/pack-04.json',
  'content/vocab/pack-05.json'
];

// GitHub Pages lets browsers reuse a file for 10 minutes without asking. So the offline copy is
// downloaded fresh ('reload'), and online requests always check the server ('no-cache'; an
// unchanged file costs only a short "not modified" answer).
self.addEventListener('install', (event) => {
  const fresh = SHELL.map((url) => new Request(url, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(fresh)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Recorded voice clips never change under the same address (the manifest version is in the URL), so they
// are served from the cache once played. An iPhone asks for media in byte ranges and only plays the
// answer if it is a 206, so a range is cut out of the whole file here.
async function clipResponse(req) {
  const cache = await caches.open(CACHE);
  let res = await cache.match(req.url);
  if (!res) {
    res = await fetch(req.url);
    if (res.ok) await cache.put(req.url, res.clone());
  }
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (!res.ok || !range) return res;
  const data = await res.arrayBuffer();
  const start = range[1] ? Number(range[1]) : 0;
  const end = range[2] ? Math.min(Number(range[2]), data.byteLength - 1) : data.byteLength - 1;
  return new Response(data.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: { 'Content-Type': 'audio/mpeg', 'Content-Range': `bytes ${start}-${end}/${data.byteLength}`, 'Content-Length': String(end - start + 1) },
  });
}

// Network first, so new lessons appear as soon as they are online; cache when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (/\/audio\/[a-z]{2}\/[a-z0-9_-]+\/[0-9a-z]+\.mp3$/.test(new URL(req.url).pathname)) {
    event.respondWith(clipResponse(req).catch(() => Response.error()));
    return;
  }
  event.respondWith(
    // By URL: a page request ("navigate" mode) cannot be copied with new options.
    fetch(req.url, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? Response.error())),
  );
});
