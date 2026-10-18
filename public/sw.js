// Minimal service worker: lets phones install the site as an app.
// It doesn't cache anything, so the app always shows the latest photos and films.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
