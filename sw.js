// Cache hors ligne : changer VERSION à chaque mise à jour des fichiers.
const VERSION = "v3";
const FICHIERS = [
  "./", "index.html", "calculs.js", "manifest.json", "icon-192.png", "icon-512.png",
  "cas/index.js", ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `cas/medfeed${n}.js`),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Réseau d'abord (pour voir les mises à jour), cache si hors ligne.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copie = r.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copie));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
