const CACHE_NAME = "pinsta-pwa-v2";
const PRECACHE_ASSETS = [
    "/",
    "/index.html",
    "/favicon.svg",
    "/manifest.json",
    "/pwa-192x192.png",
    "/pwa-512x512.png",
    "/notification.wav"
];

// 1. Service Worker Installation: Pre-cache core shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn("Pre-caching assets error:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// 2. Service Worker Activation: Clean up stale caches & claim clients
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Handler: Offline support & smart caching
self.addEventListener("fetch", (event) => {
    const { request } = event;

    // Only handle GET requests
    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // Bypass API requests and WebSocket endpoints from Service Worker caching
    if (url.pathname.startsWith("/api") || url.protocol === "ws:" || url.protocol === "wss:") {
        return;
    }

    // Navigation requests (HTML pages): Network-First with Cache fallback for SPA
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const cachedIndex = await cache.match("/index.html");
                return cachedIndex || fetch(request);
            })
        );
        return;
    }

    // Static assets (JS, CSS, fonts, images, sounds): Stale-While-Revalidate
    if (
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/assets/") ||
         url.pathname.endsWith(".js") ||
         url.pathname.endsWith(".css") ||
         url.pathname.endsWith(".woff2") ||
         url.pathname.endsWith(".png") ||
         url.pathname.endsWith(".svg") ||
         url.pathname.endsWith(".wav"))
    ) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                const fetchPromise = fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                }).catch(() => cachedResponse);

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }
});

// 4. WebPush Notification Handler
self.addEventListener("push", (event) => {
    if (!event.data) return;

    event.waitUntil(
        (async () => {
            try {
                const data = event.data.json();

                // If the user has this exact chat open and focused in an active window, suppress OS popup banner
                const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
                const isChatActivelyOpen = windowClients.some((client) => {
                    return client.visibilityState === "visible" &&
                        client.focused &&
                        data.chatId &&
                        client.url &&
                        client.url.includes(`/chats/${data.chatId}`);
                });

                if (!data.isTest && isChatActivelyOpen) {
                    return;
                }

                const tag = data.tag || (data.chatId ? `chat_${data.chatId}` : "general_notification");
                const senderName = data.senderName || "Someone";
                const newBody = data.body || "You have a new message!";
                let title = data.title || `New message from ${senderName}`;
                let messageCount = data.count || 1;

                // Check for existing notifications with this tag to collapse/aggregate in the OS tray
                if ("getNotifications" in self.registration && tag) {
                    const existingNotifications = await self.registration.getNotifications({ tag });
                    if (existingNotifications && existingNotifications.length > 0) {
                        const prevNotification = existingNotifications[0];
                        const prevCount = prevNotification.data?.count || 1;
                        messageCount = (data.count && data.count > 1) ? data.count : (prevCount + 1);
                        title = `${senderName} (${messageCount} new messages)`;
                    }
                }

                const options = {
                    body: newBody,
                    icon: data.icon || "/pwa-192x192.png",
                    badge: data.badge || "/pwa-192x192.png",
                    tag: tag,
                    renotify: true,
                    silent: false,
                    vibrate: [200, 100, 200],
                    data: {
                        url: data.url || (data.chatId ? `/chats/${data.chatId}` : "/"),
                        chatId: data.chatId,
                        count: messageCount
                    }
                };

                await self.registration.showNotification(title, options);
            } catch (err) {
                console.error("Error processing push notification in service worker:", err);
            }
        })()
    );
});

// 5. Notification Click Handler
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const relativeUrl = event.notification.data?.url || "/";
    const targetUrl = new URL(relativeUrl, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            // Focus if matching tab is already open
            for (let client of windowClients) {
                if (client.url === targetUrl && "focus" in client) {
                    return client.focus();
                }
            }
            // If any window of our origin is open, navigate and focus it
            for (let client of windowClients) {
                if ("navigate" in client && "focus" in client) {
                    client.focus();
                    return client.navigate(targetUrl);
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
