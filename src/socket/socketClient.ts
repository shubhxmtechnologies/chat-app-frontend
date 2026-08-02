import { io, Socket } from "socket.io-client";

import { envConfig } from "../config/env";

// Strip the /api suffix — Socket.IO interprets URL paths as namespaces.
const SOCKET_URL = envConfig.API_URL.replace(/\/api\/?$/, "");

export const socket: Socket = io(
    SOCKET_URL,
    {
        autoConnect: false,

        withCredentials: true,
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

/*
 * Connect with the latest access token.
 */
export const connectSocket = (
    token: string
): void => {
    if (socket.connected) {
        socket.disconnect();
    }

    socket.auth = {
        token,
    };

    socket.connect();
};

/*
 * Clean disconnect.
 */
export const disconnectSocket = (): void => {
    if (socket.connected) {
        socket.disconnect();
    }
};