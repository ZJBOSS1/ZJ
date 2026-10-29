/* ZJ OS service worker — app-shell cache only.
 * Never caches API responses or user data.
 *
 * v3: added extracted CSS/JS, zj-enhancements.js, and the two local images.
 *     Required for offline reload after the Phase 2/3 extraction — without
 *     these entries, the HTML loads from cache but its styles and scripts
 *     404 offline and the app renders unstyled and dead.
 *
 * BUMP CACHE_NAME on every deploy that changes a file in CORE_ASSETS.
 * The activate hook deletes any cache with an older CACHE_PREFIX so bumps
 * are safe. There is no build step, so this is the only cache-busting lever.
 */
const CACHE_PREFIX = 'zj-os-shell-';
const CACHE_NAME   = CACHE_PREFIX + 'v3';

// Full app shell. Any file index.html needs to boot offline must be here.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',

  // Local images used by the dashboard widget and gallery grid.
  './ZJPP.jpeg',
  './bmw.jpeg',

  // Standalone classic script (loaded via <script src>).
  './zj-enhancements.js',

  // Extracted stylesheets (Phase 2).
  './styles/variables.css',
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/tools.css',
  './styles/workspace.css',
  './styles/chat.css',
  './styles/mobile.css',

  // Extracted ES modules (Phase 3). ESM import graph — must all be precached.
  './js/main.js',
  './js/state.js',
  './js/utils.js',
  './js/tabs.js',
  './js/calculator.js',
  './js/weather.js',
  './js/clock.js',
  './js/notes.js',
  './js/todos.js',
  './js/habits.js',
  './js/bookmarks.js',
  './js/gallery.js',
  './js/notion.js',
  './js/chatbot.js',
  './js/pomodoro.js',
  './js/converter.js',
  './js/password.js',
  './js/colorpicker.js',
  './js/command-palette.js',
  './js/settings.js',
  './js/calendar.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache: 'reload' bypasses the HTTP cache so a bumped version always
    // fetches fresh bytes. One asset failing must not fail the whole install.
    await Promise.all(CORE_ASSETS.map(async asset => {
      try { await cache.add(new Request(asset, { cache: 'reload' })); }
      catch (error) { console.warn('Could not precache app asset:', asset, error); }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API endpoints are network-only. Do not cache chat, health, or future sync.
  if (/^\/(api\/|chat(?:\/|$)|health(?:\/|$))/.test(url.pathname)) return;

  // Navigations: network-first so a fresh deploy is picked up immediately.
  // Falls back to the cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Update the cached shell so next offline load has the latest HTML.
          // Awaited — avoids a race where the SW terminates before the write.
          try { await cache.put('./index.html', response.clone()); } catch {}
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

  // Subresources: cache-first. Pre-cached app-shell assets serve instantly.
  // Unknown files fall through to the network; offline unknowns return 504.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try { return await fetch(request); }
    catch (_) { return new Response('', { status: 504, statusText: 'Offline' }); }
  })());
});
