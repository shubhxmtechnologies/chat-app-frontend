import { 
    savePushSubscription, 
    deletePushSubscription, 
    sendTestPushNotification as sendTestPushApi 
} from "../api/user.api";

export const urlBase64ToUint8Array = (base64String: string): BufferSource => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

/**
 * Detects if the current browser is Brave
 */
export const isBraveBrowser = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const nav = window.navigator as any;
    if (nav.brave && typeof nav.brave.isBrave === "function") {
        try {
            return await nav.brave.isBrave();
        } catch {
            return false;
        }
    }
    return false;
};

/**
 * Checks if the browser environment supports Web Push notifications
 */
export const isPushSupported = (): boolean => {
    return (
        typeof window !== "undefined" &&
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window
    );
};

export interface PushSubscriptionResult {
    success: boolean;
    error?: string;
    code?: "SUCCESS" | "UNSUPPORTED" | "PERMISSION_DENIED" | "BRAVE_GCM_DISABLED" | "PUSH_ERROR";
    isBrave?: boolean;
}

export interface PushStatusDetails {
    supported: boolean;
    permission: NotificationPermission | "unsupported";
    isSubscribed: boolean;
    isBrave: boolean;
    subscription: PushSubscription | null;
}

/**
 * Get current push status including browser permission, active subscription, and Brave detection
 */
export const getPushSubscriptionDetails = async (): Promise<PushStatusDetails> => {
    const isBrave = await isBraveBrowser();

    if (!isPushSupported()) {
        return {
            supported: false,
            permission: "unsupported",
            isSubscribed: false,
            isBrave,
            subscription: null,
        };
    }

    const permission = Notification.permission;
    let subscription: PushSubscription | null = null;

    try {
        if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.getRegistration("/sw.js") 
                || await navigator.serviceWorker.ready;
            if (registration && registration.pushManager) {
                subscription = await registration.pushManager.getSubscription();
            }
        }
    } catch (e) {
        console.warn("Error checking existing push subscription:", e);
    }

    return {
        supported: true,
        permission,
        isSubscribed: !!subscription && permission === "granted",
        isBrave,
        subscription,
    };
};

/**
 * Subscribe user to real-time Web Push notifications.
 * Handles permission request, ServiceWorker readiness, Brave FCM check, and backend sync.
 */
export const subscribeUserToPush = async (vapidPublicKey: string): Promise<PushSubscriptionResult> => {
    const isBrave = await isBraveBrowser();

    if (!isPushSupported()) {
        return {
            success: false,
            code: "UNSUPPORTED",
            isBrave,
            error: "Web Push notifications are not supported in this browser."
        };
    }

    try {
        // 1. Request notification permission if not yet decided
        let permission = Notification.permission;
        if (permission === "default") {
            permission = await Notification.requestPermission();
        }

        if (permission === "denied") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                isBrave,
                error: "Notification permission was blocked in browser settings. Please allow notifications in site permissions."
            };
        }

        if (permission !== "granted") {
            return {
                success: false,
                code: "PERMISSION_DENIED",
                isBrave,
                error: "Notification permission was dismissed or not granted."
            };
        }

        // 2. Ensure Service Worker is registered and active
        let registration = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!registration) {
            registration = await navigator.serviceWorker.register("/sw.js");
        }

        // Wait until service worker is activated
        if (registration.installing || registration.waiting) {
            await new Promise<void>((resolve) => {
                const sw = registration!.installing || registration!.waiting;
                if (!sw) return resolve();
                sw.addEventListener("statechange", () => {
                    if (sw.state === "activated") resolve();
                });
                // Fallback timeout after 2 seconds
                setTimeout(resolve, 2000);
            });
        }

        await navigator.serviceWorker.ready;

        // 3. Obtain or create PushSubscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            try {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
                });
            } catch (subErr: any) {
                console.error("PushManager.subscribe error:", subErr);
                const errMsg = String(subErr?.message || subErr || "").toLowerCase();
                const errName = subErr?.name || "";

                // Brave blocks Google Push Messaging (FCM) unless enabled in brave://settings/privacy
                if (
                    isBrave ||
                    errName === "AbortError" ||
                    errMsg.includes("push service error") ||
                    errMsg.includes("registration failed")
                ) {
                    return {
                        success: false,
                        code: "BRAVE_GCM_DISABLED",
                        isBrave: true,
                        error: "Brave blocks push messaging by default. In Brave, go to brave://settings/privacy, enable 'Use Google services for push messaging', and restart Brave."
                    };
                }

                return {
                    success: false,
                    code: "PUSH_ERROR",
                    isBrave,
                    error: subErr?.message || "Failed to register push subscription with browser service."
                };
            }
        }

        // 4. Save to backend database
        await savePushSubscription(subscription);

        return {
            success: true,
            code: "SUCCESS",
            isBrave
        };
    } catch (error: any) {
        console.error("Error subscribing to push:", error);
        return {
            success: false,
            code: "PUSH_ERROR",
            isBrave,
            error: error?.message || "An unexpected error occurred while enabling notifications."
        };
    }
};

/**
 * Unsubscribe user from Web Push notifications (removes from browser and server)
 */
export const unsubscribeUserFromPush = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.getRegistration("/sw.js")
                || await navigator.serviceWorker.ready;
            if (registration && registration.pushManager) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                }
            }
        }

        await deletePushSubscription();
        return { success: true };
    } catch (error: any) {
        console.error("Error unsubscribing from push:", error);
        return {
            success: false,
            error: error?.message || "Failed to unsubscribe from notifications"
        };
    }
};

/**
 * Trigger a real-time test notification to verify delivery
 */
export const triggerTestNotification = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        await sendTestPushApi();
        return { success: true };
    } catch (error: any) {
        return {
            success: false,
            error: error?.message || "Failed to send test notification"
        };
    }
};
