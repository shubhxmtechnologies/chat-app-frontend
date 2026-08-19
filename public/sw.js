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

                if (isChatActivelyOpen) {
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
                    icon: data.icon || "/favicon.svg",
                    badge: data.badge || "/favicon.svg",
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
