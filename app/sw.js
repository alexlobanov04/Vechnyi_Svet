/**
 * Service Worker для PWA "Вечный Свет"
 * Обеспечивает оффлайн-доступ к приложению
 * v4 - Added display.js module
 */

const CACHE_NAME = 'eternal-light-v10';

// Core app files (always cached)
const CORE_ASSETS = [
    './',
    './controller.html',
    './display.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    // CSS
    './css/variables.css',
    './css/controller.css',
    './css/display.css',
    // Core JS
    './js/app.js',
    './js/common.js',
    './js/display.js',  // Display window module
    // Modules
    './js/modules/canonical.js',  // NEW: Canonical book codes
    './js/modules/search.js',
    './js/modules/broadcast.js',
    './js/modules/history.js',
    './js/modules/settings.js',
    './js/modules/dom-utils.js',
    './js/modules/loader.js'
];

// Large data files (cached separately, can be loaded on demand)
const DATA_ASSETS = [
    './js/data/bible_data.js',
    './js/data/nrt_data.js',
    './js/data/ktb_data.js',
    './js/data/kyb_data.js'
];

// All assets to cache on install
const ASSETS_TO_CACHE = [...CORE_ASSETS, ...DATA_ASSETS];

// Installation: cache all resources
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW v3] Кеширование ресурсов...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation: remove old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW v3] Удаление старого кеша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy: Cache First for static assets, Network First for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // For data files: Network-first (to get updates), fallback to cache
    if (url.pathname.includes('/js/data/')) {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // For everything else: Cache-first
    event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * Cache-first strategy
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW v3] Оффлайн, ресурс не найден:', request.url);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first strategy (for data that might be updated)
 */
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Fallback to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        console.log('[SW v3] Оффлайн, данные не найдены:', request.url);
        return new Response('Offline', { status: 503 });
    }
}
