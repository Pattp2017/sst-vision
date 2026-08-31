const CACHE_NAME = "sst-vision-v18";

const ARQUIVOS_CACHE = [
  "./",
  "./index.html",
  "./analise.html",
  "./analises.html",
  "./analise-detalhe.html",
  "./css/style.css",
  "./js/app.js",
  "./js/voice.js",
  "./js/manual-achados.js",
  "./js/validacao.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_CACHE)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.map((nome) => nome !== CACHE_NAME ? caches.delete(nome) : null))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((r) => {
    if (r && r.status === 200 && r.type !== "opaque") caches.open(CACHE_NAME).then((c) => c.put(event.request, r.clone()));
    return r;
  }).catch(() => caches.match(event.request).then((r) => r || (event.request.mode === "navigate" ? caches.match("./index.html") : undefined))));
});
