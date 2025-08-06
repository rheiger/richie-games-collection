const CACHE_NAME = 'squash-v1';
const urlsToCache = [
    './',
    './game.js',
    './game.css',
    './translations.js',
    '../css/',
    '../css/common.css',
    '../js/',
    '../js/common.js',
    './index.html',
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