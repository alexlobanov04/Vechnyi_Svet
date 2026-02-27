/**
 * Service Worker для PWA "Вечный Свет"
 * Обеспечивает оффлайн-доступ к приложению
 * v5 - Network-first for code files to ensure updates are always applied
 */

const CACHE_NAME = 'eternal-light-v15';

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
    './js/display.js',
    // Modules
    './js/modules/backgrounds.js',
    './js/modules/bible-ui.js',
    './js/modules/broadcast.js',
    './js/modules/canonical.js',
    './js/modules/dom-utils.js',
    './js/modules/history.js',
    './js/modules/loader.js',
    './js/modules/notes-ui.js',
    './js/modules/presentations.js',
    './js/modules/search.js',
    './js/modules/settings.js',
    './js/modules/songs-ui.js',
    './js/modules/songs.js',
    './js/modules/state.js'
];

// Large data files (cached separately)
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
                console.log('[SW v5] Кеширование ресурсов...');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation: remove ALL old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW v5] Удаление старого кеша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch strategy: Network-first for HTML/CSS/JS, Cache-first only for icons/images
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // For ALL code files (HTML, CSS, JS): Network-first
    // This ensures updates are always applied immediately
    if (url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname === '/' ||
        url.pathname === './') {
        event.respondWith(networkFirstStrategy(event.request));
        return;
    }

    // For static assets (icons, images, fonts): Cache-first
    event.respondWith(cacheFirstStrategy(event.request));
});

/**
 * Network-first strategy (always tries network, falls back to cache)
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
        // Fallback to cache when offline
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        console.log('[SW v5] Оффлайн, ресурс не найден:', request.url);
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Cache-first strategy (for static assets like images)
 */
async function cacheFirstStrategy(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.log('[SW v5] Оффлайн, ресурс не найден:', request.url);
        return new Response('Offline', { status: 503 });
    }
}
