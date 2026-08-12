import { useCallback, useEffect, useRef } from "react";
import { socket } from "../socket/socketClient";

export const useTypingIndicator = (chatId: string, recipientId?: string) => {
    const lastTypingEmitRef = useRef<number>(0);
    const stopTypingTimeoutRef = useRef<number | null>(null);

    const emitStopTyping = useCallback(() => {
        if (stopTypingTimeoutRef.current) {
            clearTimeout(stopTypingTimeoutRef.current);
            stopTypingTimeoutRef.current = null;
        }
        if (recipientId) {
            socket.emit("stop_typing", { chatId, recipientId });
        }
        lastTypingEmitRef.current = 0;
    }, [chatId, recipientId]);

    const handleTyping = useCallback(() => {
        const now = Date.now();

        if (now - lastTypingEmitRef.current > 2000) {
            if (recipientId) {
                socket.emit("typing", { chatId, recipientId });
            }
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
            // Emit final stop_typing when component unmounts
            if (recipientId) {
                socket.emit("stop_typing", { chatId, recipientId });
            }
        };
    }, [chatId, recipientId]);

    return { handleTyping, stopTyping };
};