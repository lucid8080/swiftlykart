// Grocery List PWA Service Worker
const CACHE_NAME = "grocery-list-v4";
const STATIC_CACHE = "grocery-static-v4";
const DYNAMIC_CACHE = "grocery-dynamic-v4";

// Static assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.includes("v2")) // Delete all old caches (v1)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) return;

  // NFC tap routes - MUST bypass service worker completely
  // These routes MUST hit the server to log taps
  if (url.pathname.startsWith("/t/")) {
    console.log("[SW] NFC tap route detected, bypassing service worker:", url.pathname);
    // Don't call event.respondWith - let the browser handle it natively
    // This ensures the request goes directly to the server
    return;
  }

  // API requests: /api/items - stale-while-revalidate
  if (url.pathname === "/api/items") {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // API requests: /api/list - network-first
  if (url.pathname === "/api/list") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Other API requests - network only
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets and pages - cache-first
  event.respondWith(cacheFirst(event.request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available
    const offlinePage = await caches.match("/");
    if (offlinePage) return offlinePage;
    throw error;
  }
}

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      console.log("[SW] Returning cached response for:", request.url);
      return cached;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
