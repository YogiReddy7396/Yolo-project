const CACHE_NAME = 'waste-ai-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/admin.html',
    '/css/style.css',
    '/js/main.js',
    '/js/auth.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (event) => {
    // Strategy: Network First, fallback to Cache (for dynamic API calls we skip cache usually, but for assets we want speed)
    // Actually, for an app like this, Stale-While-Revalidate or Network First is good.
    // Let's keep it simple: Network First for HTML/API, Cache First for static assets if we wanted.
    // Given the interactive nature, let's just do a simple pass-through with fallback for core files.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
