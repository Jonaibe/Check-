/* ════════════════════════════════════════════════════════════
   Check+ · Service Worker
   Estratégia: Cache First para assets estáticos,
               Network First para chamadas à GitHub API
════════════════════════════════════════════════════════════ */

const CACHE_NAME  = 'checkv-v1';
const CACHE_URLS  = [
  '/Check-/',
  '/Check-/index.html',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap',
];

/* ── INSTALL: pré-caches o app shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

/* ── ACTIVATE: remove caches antigos ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── FETCH: estratégia híbrida ── */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // GitHub API → sempre vai para a rede (dados em tempo real)
  if (url.includes('api.github.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Google Fonts → cache primeiro
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached =>
        cached || fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // App shell (index.html, ícones) → cache primeiro, rede como fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      });
    })
  );
});
