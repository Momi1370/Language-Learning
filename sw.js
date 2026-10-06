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
  'js/content.js',
  'js/diary.js',
  'js/match.js',
  'js/session.js',
  'js/speech.js',
  'js/srs.js',
  'js/store.js',
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
  'js/ui/widgets.js',
  'content/words.json',
  'content/nl/week-01.json',
  'content/en/week-01.json'
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

// Network first, so new lessons appear as soon as they are online; cache when offline.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
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
