/* tv-sw.js — Hostamar TV save-data service worker.
 * Caches HLS .ts segments in the Cache API so seeks/rewinds never re-download
 * and the background prefetch worker can warm segments before the player asks.
 * Strategy:
 *   .m3u8  -> network-first, fall back to cache (playlists must be fresh)
 *   .ts    -> cache-first, fall back to network (immutable once written)
 */
const CACHE = 'tv-hls-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'prefetch' && Array.isArray(d.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      for (const url of d.urls) {
        try {
          const hit = await cache.match(url);
          if (hit) continue;
          const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (resp.ok) await cache.put(url, resp.clone());
        } catch (_) { /* ignore individual failures */ }
      }
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: 'prefetched', count: d.urls.length }));
    })());
  }
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  if (!url.includes('/hls/') || event.request.method !== 'GET') return;

  if (url.endsWith('.m3u8')) {
    // Network-first for playlists
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(url, clone)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(url).then((c) => c || Response.error()))
    );
    return;
  }

  if (/\.ts$|\.m4s$/.test(url)) {
    // Cache-first for segments
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(url);
        if (hit) return hit;
        try {
          const resp = await fetch(event.request);
          if (resp.ok) await cache.put(url, resp.clone());
          return resp;
        } catch (_) {
          const stale = await cache.match(url);
          return stale || Response.error();
        }
      })
    );
  }
});
