const CACHE_NAME = 'puzzle15-v1';
const urlsToCache = [
    './',
    '../css/',
    '../css/common.css',
    '../js/',
    '../js/common.js',
    './index.html',
    './translations.js',
    './game.js',
    './game.css',
    './icon-192x192.png',
    './icon-512x512.png',
    './favicon.ico',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});