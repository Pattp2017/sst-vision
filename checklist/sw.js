const CACHE_PREFIX = `sst-vision-checklist:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v7`;
const ASSETS = [
  './',
  './index.html',
  './cadastro-itens.html',
  './cadastro-locais.html',
  './modelos-inspecao.html',
  './inspecao-extintores.html',
  './mapa-risco.html',
  './vistoria.html',
  './checklists.html',
  './novo-checklist.html',
  './styles.css',
  './offline-cache.js',
  './persist.js',
  './speech.js',
  './db-v8.js',
  './photo.js',
  './gps.js',
  './vistoria-add-item.js',
  './vistoria-medida-corretiva.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(ASSETS.map(x => cache.add(x))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  const allowed = new Set(ASSETS.map(path => new URL(path, self.registration.scope).pathname));
  if (!allowed.has(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request, { ignoreSearch: true });
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          const vistoria = await cache.match(new URL('./vistoria.html', self.registration.scope).href, { ignoreSearch: true });
          if (vistoria && url.pathname.endsWith('/vistoria.html')) return vistoria;

          const inicio = await cache.match(new URL('./index.html', self.registration.scope).href, { ignoreSearch: true });
          if (inicio) return inicio;
        }

        throw new Error('Recurso não disponível no cache offline.');
      })
  );
});
