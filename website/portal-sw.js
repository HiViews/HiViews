// portal-sw.js — minimal service worker for /portal/* PWA.
//
// Strategy:
//   - Network-first for HTML (portal pages), so new UI ships fast.
//   - Cache-first for CDN assets (fonts, Tailwind, esm.sh) — they're
//     immutable by version anyway.
//   - Never cache Supabase REST or Realtime traffic (always live).
//
// This SW is intentionally thin. No background sync, no push. The
// heavy lifting (realtime updates) is already handled by Supabase.

const VERSION = 'hv-portal-v1';
const STATIC_CACHE = 'hv-portal-static-' + VERSION;

const STATIC_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'esm.sh',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Supabase API — always live.
  if (url.hostname.endsWith('supabase.co')) {
    return; // pass through untouched
  }

  // 2. Portal HTML — network-first so new deploys appear instantly,
  //    fall back to cache if offline.
  if (url.origin === self.location.origin && url.pathname.startsWith('/portal')) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 3. Static CDN assets — cache-first, update in background.
  if (STATIC_HOSTS.some((h) => url.hostname.endsWith(h))) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          // stale-while-revalidate
          fetch(req).then((resp) => caches.open(STATIC_CACHE).then((c) => c.put(req, resp))).catch(() => {});
          return cached;
        }
        return fetch(req).then((resp) => {
          const clone = resp.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Everything else — pass through.
});
