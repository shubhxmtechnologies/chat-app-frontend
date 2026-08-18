import { io, Socket } from "socket.io-client";

import { envConfig } from "../config/env";

// Strip the /api suffix — Socket.IO interprets URL paths as namespaces.
const SOCKET_URL = envConfig.API_URL.replace(/\/api\/?$/, "");

export const socket: Socket = io(
    SOCKET_URL,
    {
        autoConnect: false,
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5, // Adds jitter to prevent reconnection storms on backend
        timeout: 10000,
    }
);

socket.on("connect_error", (error) => {
    console.error(
        "Socket connection failed:",
        error.message
    );
});

socket.on("disconnect", (reason) => {
    console.warn(
        "Socket disconnected:",
        reason
    );
});

// H3: Server emits "auth_error" when token expires or user logs out.
// AuthContext sets the callback to trigger a full logout.
let authErrorCallback: (() => void) | null = null;

export const setSocketAuthErrorHandler = (handler: () => void) => {
    authErrorCallback = handler;
};

socket.on("auth_error", () => {
    if (authErrorCallback) {
        authErrorCallback();
    }
});

/*
 * Connect with the latest access token or update token if already connected.
 */
export const connectSocket = (
    token: string
): void => {
    socket.auth = {
        token,
    };

    if (socket.connected) {
        socket.emit("update_auth_token", token);
    } else {
        socket.connect();
    }
};

/*
 * Clean disconnect.
 */
export const disconnectSocket = (): void => {
    if (socket.connected) {
        socket.disconnect();
    }
};