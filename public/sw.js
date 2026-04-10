// CanvassTrack Service Worker
const CACHE = 'canvasstrack-v3';

// Cache the app shell on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll([
      '/',
      '/manifest.json',
      '/icon-192.png',
      '/icon-512.png',
    ]))
  );
  self.skipWaiting();
});

// Clean old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first for API calls, cache first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network for API calls
  if(url.pathname.startsWith('/api/')) return;

  // Cache first for static assets (icons, manifest)
  if(url.pathname.match(/\.(png|json|js|css)$/)){
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // Network first for HTML (always get latest app)
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
