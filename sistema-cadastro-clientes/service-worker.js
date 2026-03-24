const CACHE_NAME = "sistema-cadastro-v10";
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
  "./suporte.html",
  "./suporte.js",
  "./pdvs-monitor.html",
  "./pdvs-monitor.js",
  "./vendas.js",
  "./theme-defaults.js",
  "./manifest.json",
  "./app-icon-192.png",
  "./app-icon-512.png"
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

  // Sempre prioriza rede para recursos do próprio app.
  // Evita precisar Ctrl+Shift+R após deploy em produção.
  if (isSameOrigin) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, responseClone));
          return response;
        })
        .catch(() =>
          caches.match(req).then((cached) => {
            if (cached) return cached;
            if (req.destination === "document") return caches.match("./login.html");
            return new Response("", { status: 504, statusText: "Gateway Timeout" });
          })
        )
    );
    return;
  }

  // Requisições de outros domínios seguem padrão normal.
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
