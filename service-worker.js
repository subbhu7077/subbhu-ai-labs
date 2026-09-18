const CACHE_NAME = 'subbhu-ai-v1';
const ASSETS = [
  './',
  './index.html',
  './create.html',
  './history.html',
  './profile.html',
  './login.html',
  './css/style.css',
  './css/responsive.css',
  './css/animations.css',
  './js/tools.js',
  './js/upload.js',
  './js/ui.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
