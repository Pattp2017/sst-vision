const CACHE_NAME = "sst-vision-v10";

const ARQUIVOS_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/voice.js",
  "./js/manual-achados.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((nomesCaches) => Promise.all(nomesCaches.map((nomeCache) => nomeCache !== CACHE_NAME ? caches.delete(nomeCache) : null))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then((respostaRede) => {
      if (respostaRede && respostaRede.status === 200 && respostaRede.type !== "opaque") {
        const respostaClone = respostaRede.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respostaClone));
      }
      return respostaRede;
    }).catch(() => caches.match(event.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      if (event.request.mode === "navigate") return caches.match("./index.html");
    }))
  );
});
