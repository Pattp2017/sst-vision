const CACHE_PREFIX = `sst-vision:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}v24`;
const ARQUIVOS_CACHE = [
  "./",
  "./index.html",
  "./analise.html",
  "./analises.html",
  "./analise-detalhe.html",
  "./css/style.css",
  "./css/home.css",
  "./css/field-offline.css",
  "./js/home.js",
  "./js/field-offline.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./mapa-risco/index.html",
  "./vendor/pdfjs/pdf.min.js",
  "./vendor/pdfjs/pdf.worker.min.js",
  "./js/validacao.js",
  "./js/vision-core.js",
  "./js/voice.js",
  "./js/json-compat.js",
  "./js/manual-achados.js",
  "./js/coordinate-fix.js",
  "./js/evidencias.js",
  "./js/app.js",
  "./checklist/novo-checklist.html",
  "./checklist/mapa-risco.html",
  "./checklist/db.js",
  "./checklist/offline-cache.js",
  "./checklist/vistoria.html",
  "./checklist/gps.js",
  "./checklist/migrar-modelo.html",
  "./checklist/checklists.html",
  "./checklist/cadastro-locais.html",
  "./checklist/speech.js",
  "./checklist/styles.css",
  "./checklist/inspecao-extintores.html",
  "./checklist/cadastro-itens.html",
  "./checklist/photo.js",
  "./checklist/db-v8.js",
  "./checklist/modelos-inspecao.html",
  "./checklist/vistoria-add-item.js",
  "./checklist/persist.js",
  "./checklist/vistoria-medida-corretiva.js",
  "./checklist/index.html",
  "./js/cadastro-context.js"
];
const CACHE_URLS = new Set(ARQUIVOS_CACHE.map(path => new URL(path, self.registration.scope).pathname));

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
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !CACHE_URLS.has(url.pathname)) return;
  const canonical = url.origin + url.pathname;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok && response.type !== 'opaque') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(canonical, copy)));
    }
    return response;
  }).catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(canonical) || Response.error();
  }));
});
