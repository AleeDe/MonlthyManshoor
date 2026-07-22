// Simple service worker:
//  - app shell: network-first with cache fallback (so deploys update fast)
//  - Sanity CDN images + PDFs: cache-first (immutable content-hashed URLs)
const CACHE = 'manshoor-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Sanity assets (covers, PDFs) are content-addressed: safe to cache forever
  if (url.hostname === 'cdn.sanity.io') {
    e.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Same-origin navigation/app shell: network first, cache fallback (offline)
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && (e.request.mode === 'navigate' || url.pathname.startsWith('/assets/'))) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(e.request);
          if (hit) return hit;
          if (e.request.mode === 'navigate') {
            const shell = await caches.match('/');
            if (shell) return shell;
          }
          throw new Error('offline');
        })
    );
  }
});
