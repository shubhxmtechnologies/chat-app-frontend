self.addEventListener("push", (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const options = {
            body: data.body || "You have a new message!",
            icon: "/favicon.svg", // Pulling existing favicon
            badge: "/favicon.svg",
            data: { url: data.url || "/" }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || "Pinsta Chat", options)
        );
    } catch (err) {
        console.error("Error parsing push payload", err);
    }
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    
    // Resolve relative URLs to absolute URLs
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
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
