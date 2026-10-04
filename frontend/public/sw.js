// Minimal installability service worker: it intentionally caches nothing and
// passes every request straight through to the network. Its only job is to
// let Chrome treat GPort as installable (beforeinstallprompt / install UI).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough on purpose — no offline shell yet.
});
