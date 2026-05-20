const CACHE_NAME = "ya-mubiao-app-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/designv2/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8812%E6%97%A5%2014_03_17%20(2).png",
  "/designv2/ChatGPT%20Image%202026%E5%B9%B45%E6%9C%8812%E6%97%A5%2015_05_11.png",
  "/designv2/%E8%8A%BD%E7%9B%AE%E6%A0%87%E5%93%81%E7%89%8C%E6%89%8B%E5%86%8C_01_%E5%B0%81%E9%9D%A2.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("/"));
    })
  );
});
