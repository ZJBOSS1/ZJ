/* ZJ OS service worker — app-shell cache only.
 * Never caches API responses or user data.
 *
 * v3: added extracted CSS/JS, zj-enhancements.js, and the two local images.
 *     Required for offline reload after extraction — without these entries,
 *     the HTML loads from cache but its styles and scripts 404 offline.
 *
 * BUMP CACHE_NAME on every deploy that changes a file in CORE_ASSETS.
 */
const CACHE_PREFIX = 'zj-os-shell-';
const CACHE_NAME   = CACHE_PREFIX + 'v3';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',

  './ZJPP.jpeg',
  './bmw.jpeg',

  './zj-enhancements.js',

  './styles/variables.css',
  './styles/base.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/tools.css',
  './styles/workspace.css',
  './styles/chat.css',
  './styles/mobile.css',

  './js/state.js',
  './js/utils.js',
  './js/calculator.js',
  './js/converter.js',
  './js/password.js',
  './js/tabs.js',
  './js/settings.js',
  './js/notes.js',
  './js/todos.js',
  './js/habits.js',
  './js/bookmarks.js',
  './js/gallery.js',
  './js/notion.js',
  './js/pomodoro.js',
  './js/clock.js',
  './js/weather.js',
  './js/command-palette.js',
  './js/chatbot.js',
  './js/calendar.js',
  './js/colorpicker.js',
  './js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
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

  // API endpoints are network-only.
  if (/^\/(api\/|chat(?:\/|$)|health(?:\/|$))/.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
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

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try { return await fetch(request); }
    catch (_) { return new Response('', { status: 504, statusText: 'Offline' }); }
  })());
});
