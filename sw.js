const CACHE_NAME = "termicas-runtime-v3-2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.webmanifest",
  "./version.json"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      // Sempre tenta a internet primeiro e ignora o cache HTTP do navegador.
      // Assim uma publicação nova chega no celular sem precisar limpar dados manualmente.
      const fresh = await fetch(request, { cache: "no-store" });
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (error) {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;

      if (request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
