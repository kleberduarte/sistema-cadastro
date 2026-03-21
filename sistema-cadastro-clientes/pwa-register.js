(() => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    const host = window.location.hostname || "";
    const isLocalDev =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local");

    // Em ambiente local, desativa PWA para evitar cache agressivo durante desenvolvimento.
    if (isLocalDev) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});

      if (window.caches && typeof window.caches.keys === "function") {
        window.caches.keys()
          .then((keys) =>
            Promise.all(
              keys
                .filter((k) => k.startsWith("sistema-cadastro-"))
                .map((k) => window.caches.delete(k))
            )
          )
          .catch(() => {});
      }
      return;
    }

    const inPdvFolder = window.location.pathname.includes("/pdv/");
    const swUrl = inPdvFolder ? "../service-worker.js" : "./service-worker.js";
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        // Forca checagem de update ao abrir a página
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn("Service Worker nao registrado:", err);
      });
  });
})();
