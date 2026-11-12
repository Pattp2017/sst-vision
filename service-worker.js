const CACHE_PREFIX = `sst-vision:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v19`;
const ARQUIVOS_CACHE = [
  './', './index.html', './analise.html', './analises.html',
  './analise-detalhe.html', './css/style.css', './js/app.js',
  './js/voice.js', './js/manual-achados.js', './js/validacao.js',
  './manifest.json', './assets/icons/icon-192.png', './assets/icons/icon-512.png'
];
const CACHE_URLS = new Set(ARQUIVOS_CACHE.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ARQUIVOS_CACHE)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  // Only listed static SST files enter the cache. Training and database
  // requests always use the network, preserving errors and current data.
  if (event.request.method !== 'GET' || !CACHE_URLS.has(event.request.url)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type !== 'opaque') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
    }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(event.request) || Response.error();
  }));
});
