const CACHE = 'taalmaatje-v1';
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
  'js/ui/shadow.js',
  'js/ui/sound.js',
  'js/ui/speak.js',
  'js/ui/today.js',
  'js/ui/widgets.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
    fetch(req)
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
