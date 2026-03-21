const CACHE_NAME = "sistema-cadastro-v3";
const CORE_ASSETS = [
  "./",
  "./login.html",
  "./index.html",
  "./styles.css",
  "./auth.js",
  "./config.js",
  "./nav.js",
  "./script.js",
  "./produtos.html",
  "./produtos.js",
  "./usuarios.html",
  "./usuarios.js",
  "./relatorios.html",
  "./relatorios.js",
  "./parametros.html",
  "./pdvs-monitor.html",
  "./pdvs-monitor.js",
  "./vendas.js",
  "./theme-defaults.js",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShell =
    req.destination === "document" ||
    req.destination === "script" ||
    req.destination === "style";

  // Para HTML/JS/CSS do próprio app: sempre tenta rede primeiro.
  // Isso evita ficar preso em arquivos antigos ao trocar de usuário/perfil.
  if (isSameOrigin && isAppShell) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          return response;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Demais assets: cache-first com atualização quando vier da rede.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
