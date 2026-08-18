const CACHE_NAME = "sst-vision-v7";

const ARQUIVOS_CACHE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// =========================================================
// INSTALAÇÃO
// =========================================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ARQUIVOS_CACHE);
      })
  );

  self.skipWaiting();
});

// =========================================================
// ATIVAÇÃO
// =========================================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomesCaches) => {
        return Promise.all(
          nomesCaches.map((nomeCache) => {
            if (nomeCache !== CACHE_NAME) {
              return caches.delete(nomeCache);
            }

            return null;
          })
        );
      })
  );

  self.clients.claim();
});

// =========================================================
// INTERCEPTAÇÃO DE REQUISIÇÕES
// =========================================================

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) {
        return respostaCache;
      }

      return fetch(event.request)
        .then((respostaRede) => {
          if (
            !respostaRede ||
            respostaRede.status !== 200 ||
            respostaRede.type === "opaque"
          ) {
            return respostaRede;
          }

          const respostaClone = respostaRede.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, respostaClone);
          });

          return respostaRede;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
