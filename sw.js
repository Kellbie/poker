// Ledger service worker — cache-first for the app shell.
// This file only matters if Ledger is served over http(s) or localhost
// (e.g. the host runs a local static server for the night). Opened directly
// as a downloaded file (file://), browsers refuse to register ANY service
// worker at all — that's a platform security rule, not something this code
// can work around. The app itself works fully offline either way, since
// everything (fonts, QR libraries, icons) is already inlined in the HTML
// with zero external requests.
const CACHE_NAME = 'ledger-poker-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([self.registration.scope]))
      .catch(() => {}) // never block install on a caching hiccup
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

// Cache-first, falling back to network, falling back to whatever's cached for
// the page itself if the network fails entirely (fully offline replay).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(self.registration.scope));
    })
  );
});
