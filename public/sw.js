// SlideSnap Service Worker - Auto-Updating Network-First Strategy for iOS PWA
const CACHE_NAME = 'slidesnap-v4-20261019';

const PRECACHE_ASSETS = [
  'manifest.webmanifest',
  'favicon.svg'
];

self.addEventListener('install', (event) => {
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();

  const scope = self.registration.scope;
  const assets = PRECACHE_ASSETS.map((a) => scope + a);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('activate', (event) => {
  // Delete all old caches immediately
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Allow client pages to force skip waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
  const isHtml = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  // 1. FOR NAVIGATION & HTML SHELL: Network-First!
  // Ensures iOS Home Screen shortcut ALWAYS gets the latest version when online
  if (isNavigation || isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request)
            .then((cached) => cached || caches.match(self.registration.scope) || caches.match(self.registration.scope + 'index.html'));
        })
    );
    return;
  }

  // 2. FOR HASHED ASSETS (/assets/index-*.js, css): Cache-First since Vite hashes filenames
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. OTHER SAME-ORIGIN REQUESTS: Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
