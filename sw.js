/* PDF Fill — service worker
   Precarica app e librerie: senza il worker di pdf.js in cache l'app non apre i PDF offline. */

const CACHE = "pdffill-v1";

const GUSCIO = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icona-192.png",
  "./icona-512.png",
];

const LIBRERIE = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.24.7/babel.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(GUSCIO);
    // le librerie una per una: una CDN lenta non deve far fallire l'installazione
    await Promise.all(LIBRERIE.map((u) =>
      c.add(new Request(u, {mode: "cors"})).catch(() => null)
    ));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const stessaOrigine = new URL(req.url).origin === self.location.origin;

  // app: rete per prima, così un deploy nuovo arriva subito; cache se offline
  if (stessaOrigine) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, r.clone());
        return r;
      } catch (err) {
        const dalla = await caches.match(req);
        return dalla || caches.match("./index.html");
      }
    })());
    return;
  }

  // librerie: cache per prima, sono versioni fissate
  e.respondWith((async () => {
    const dalla = await caches.match(req);
    if (dalla) return dalla;
    const r = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, r.clone());
    return r;
  })());
});
