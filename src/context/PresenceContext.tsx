import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { socket } from "../socket/socketClient";

interface PresenceContextValue {
    isOnline: (userId: string) => boolean;
    getLastSeen: (userId: string, initialLastSeen: string | null) => string | null;
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

export const PresenceProvider = ({ children }: { children: ReactNode }) => {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});

    useEffect(() => {
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
            setLastSeenMap((prev) => ({
                ...prev,
                [userId]: lastSeenAt,
            }));
        };

        socket.on("user_online", handleOnline);
        socket.on("user_offline", handleOffline);

        return () => {
            socket.off("user_online", handleOnline);
            socket.off("user_offline", handleOffline);
        };
    }, []);

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