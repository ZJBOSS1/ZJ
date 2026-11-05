/* ZJ OS service worker: cache only files that actually ship in this project.
 * API responses and user data are network-only and are never cached.
 * Bump CACHE_NAME whenever the app shell changes.
 */
const CACHE_PREFIX = 'zj-os-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v4`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './ZJPP.jpeg',
  './bmw.jpeg',
  './zj-enhancements.js'
];

const isApiRequest = (pathname) =>
  /^\/(?:api\/|chat(?:\/|$)|health(?:\/|$))/.test(pathname);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache files independently so one missing optional asset cannot abort
    // installation of the entire offline app shell.
    await Promise.all(CORE_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(new Request(asset, { cache: 'reload' }));
        if (response.ok) await cache.put(asset, response);
      } catch (error) {
        console.warn('[ZJ OS] Could not cache app asset:', asset, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isApiRequest(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('./index.html', response.clone());
        }
        return response;
      } catch (_) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        return new Response('ZJ OS is offline. Reconnect to load the app.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: false });
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (_) {
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});
