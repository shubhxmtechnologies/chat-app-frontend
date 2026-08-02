import { useCallback, useEffect, useRef } from "react";
import { socket } from "../socket/socketClient";

export const useTypingIndicator = (chatId: string) => {
    const lastTypingEmitRef = useRef<number>(0);
    const stopTypingTimeoutRef = useRef<number | null>(null);

    const emitStopTyping = useCallback(() => {
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
            stopTypingTimeoutRef.current = null;
        }
        socket.emit("stop_typing", chatId);
        lastTypingEmitRef.current = 0;
    }, [chatId]);

    const handleTyping = useCallback(() => {
        const now = Date.now();

        if (now - lastTypingEmitRef.current > 2000) {
            socket.emit("typing", chatId);
            lastTypingEmitRef.current = now;
        }

        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
        }

        stopTypingTimeoutRef.current = window.setTimeout(() => {
            emitStopTyping();
        }, 3000);
    }, [chatId, emitStopTyping]);

    const stopTyping = useCallback(() => {
        emitStopTyping();
    }, [emitStopTyping]);

    useEffect(() => {
        return () => {
            if (stopTypingTimeoutRef.current) {
                clearTimeout(stopTypingTimeoutRef.current);
            }
        };
    }, []);

    return { handleTyping, stopTyping };
};