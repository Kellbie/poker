// Ledger service worker — network-first for the app shell.
//
// This file only matters if Ledger is served over http(s) or localhost
// (e.g. GitHub Pages, or the host running a local static server for the
// night). Opened directly as a downloaded file (file://), browsers refuse
// to register ANY service worker at all — that's a platform security rule,
// not something this code can work around. The app itself works fully
// offline either way, since everything (fonts, QR libraries, icons) is
// already inlined in the HTML with zero external requests — this service
// worker exists purely as an offline *fallback* for the hosted case, not
// for performance (the page is already instant, being one self-contained
// file).
//
// IMPORTANT: this is deliberately network-first, not cache-first. With
// cache-first, once someone's phone had this page cached, it would keep
// serving that exact cached copy forever — even after re-uploading a fixed
// index.html to GitHub — because the browser only re-checks THIS sw.js file
// for changes, not the page it caches. Network-first means: whenever you
// have internet, you always get whatever's actually live on the server;
// the cache is only ever used as a fallback when there's truly no
// connection at all.
const CACHE_NAME = 'ledger-poker-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([self.registration.scope])).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(self.registration.scope)))
  );
});
