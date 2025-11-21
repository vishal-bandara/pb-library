const CACHE_NAME = "pb-library-v1";
const FILES_TO_CACHE = [
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/manifest.json",
  "/images/icon-192.png",
  "/images/icon-512.png"
];

// Install
self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (evt) => {
  evt.respondWith(caches.match(evt.request).then((resp) => resp || fetch(evt.request)));
});
