import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { socket } from "../socket/socketClient";

import { useAuth } from "./AuthContext";

interface PresenceContextValue {
    isOnline: (userId: string) => boolean;
    getLastSeen: (userId: string, initialLastSeen: string | null) => string | null;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

export const PresenceProvider = ({ children }: { children: ReactNode }) => {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
    const { status } = useAuth();

    useEffect(() => {
        if (status !== "authenticated") {
            setOnlineUsers(new Set());
            setLastSeenMap({});
            return;
        }

        const handleOnline = ({ userId }: { userId: string }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.add(userId);
                return next;
            });
        };

        const handleOffline = ({ userId, lastSeenAt }: { userId: string; lastSeenAt: string }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
            if (lastSeenAt) {
                setLastSeenMap((prev) => ({
                    ...prev,
                    [userId]: lastSeenAt,
                }));
            }
        };

        const handleInitialOnline = (userIds: string[]) => {
            // Authoritative server state — replaces set completely
            setOnlineUsers(new Set(userIds));
        };

        const handleConnect = () => {
            socket.emit("get_online_users");
        };

        socket.on("user_online", handleOnline);
        socket.on("user_offline", handleOffline);
        socket.on("initial_online_users", handleInitialOnline);
        socket.on("connect", handleConnect);

        if (socket.connected) {
            socket.emit("get_online_users");
        }

        return () => {
            socket.off("user_online", handleOnline);
            socket.off("user_offline", handleOffline);
            socket.off("initial_online_users", handleInitialOnline);
            socket.off("connect", handleConnect);
        };
    }, [status]);

    const isOnline = (userId: string) => onlineUsers.has(userId);

    const getLastSeen = (userId: string, initialLastSeen: string | null) => {
        return lastSeenMap[userId] || initialLastSeen;
    };

    return (
        <PresenceContext.Provider value={{ isOnline, getLastSeen }}>
            {children}
        </PresenceContext.Provider>
    );
};

export const usePresence = () => {
    const context = useContext(PresenceContext);
    if (!context) throw new Error("usePresence must be used inside PresenceProvider");
    return context;
};