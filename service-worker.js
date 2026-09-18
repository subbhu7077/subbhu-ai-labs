const CACHE_NAME = 'subbhu-ai-v2';
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
  './js/supabase-client.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
