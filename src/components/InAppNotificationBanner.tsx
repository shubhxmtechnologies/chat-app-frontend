import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { MessageSquare, X, ArrowRight, Camera, Mic } from "lucide-react";
import { socket } from "../socket/socketClient";
import { useAuth } from "../context/AuthContext";
import { getCachedSenderInfo } from "../api/chat.api";
import { playReceiveSound } from "../utils/sound.util";
import { AppleEmojiText } from "./AppleEmojiText";
import type { Message } from "../types/message.types";

interface ActiveToast {
    id: string;
    chatId: string;
    senderId: string;
    senderName: string;
    avatarUrl: string | null;
    preview: string;
    messageType: "text" | "image" | "voice";
}

export const InAppNotificationBanner = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState<ActiveToast | null>(null);
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        const handleReceiveMessage = (message: Message) => {
            const currentUser = userRef.current;
            if (!currentUser) return;

            // Don't show toast for own messages
            if (message.sender === currentUser.id) return;

            // Don't show toast if user is currently inside this exact chat view
            const currentChatPath = `/chats/${message.chat}`;
            if (location.pathname === currentChatPath) return;

            // Don't show if globally muted or chat muted
            if (currentUser.globalMute) return;
            if (currentUser.mutedChats?.includes(message.chat)) return;

            // Resolve sender details from cached chat participants or fallback
            const senderInfo = getCachedSenderInfo(message.chat, message.sender);
            const senderName = senderInfo?.username || "Someone";
            const avatarUrl = senderInfo?.avatarUrl || null;

            let preview = message.text || "Sent a message";
            if (message.messageType === "image") preview = "Sent a photo";
            if (message.messageType === "voice") preview = "Sent a voice note";

            // Play incoming sound chime
            try {
                playReceiveSound();
            } catch (e) {
                // Ignore audio autoplay restrictions
            }

            // Show active toast
            setToast({
                id: message._id,
                chatId: message.chat,
                senderId: message.sender,
                senderName,
                avatarUrl,
                preview,
                messageType: message.messageType,
            });

            // Auto-dismiss after 5 seconds
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
            dismissTimerRef.current = setTimeout(() => {
                setToast(null);
            }, 5000);
        };

        socket.on("receive_message", handleReceiveMessage);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, [location.pathname]);

    if (!toast) return null;

    const handleOpenChat = () => {
        const targetChatId = toast.chatId;
        setToast(null);
        navigate(`/chats/${targetChatId}`);
    };

    return (
        <aside
            aria-label="New message notification"
            className="fixed top-3 left-0 right-0 z-50 flex justify-center pointer-events-none px-4"
        >
            <AnimatePresence>
                <motion.div
                    key={toast.id}
                    initial={{ y: -60, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -50, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    onClick={handleOpenChat}
                    className="pointer-events-auto max-w-md w-full bg-card/95 backdrop-blur-xl border border-border/90 shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer group hover:border-primary/50 hover:shadow-primary/10 transition-all select-none"
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="size-10 rounded-full bg-primary/10 border border-primary/20 shrink-0 overflow-hidden flex items-center justify-center font-semibold text-primary text-sm">
                            {toast.avatarUrl ? (
                                <img
                                    src={toast.avatarUrl}
                                    alt={toast.senderName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span>{toast.senderName.charAt(0).toUpperCase()}</span>
                            )}
                        </div>

                        {/* Message Preview */}
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-xs text-foreground truncate">
                                    {toast.senderName}
                                </span>
                                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.2 rounded-full font-medium">
                                    Now
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                                {toast.messageType === "image" && (
                                    <Camera className="size-3 text-primary shrink-0" />
                                )}
                                {toast.messageType === "voice" && (
                                    <Mic className="size-3 text-primary shrink-0" />
                                )}
                                {toast.messageType === "text" && (
                                    <MessageSquare className="size-3 text-muted-foreground shrink-0" />
                                )}
                                <span className="truncate"><AppleEmojiText text={toast.preview} /></span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenChat();
                            }}
                            className="size-7 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white flex items-center justify-center transition-colors text-xs font-medium"
                            aria-label="Reply to message"
                        >
                            <ArrowRight className="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setToast(null);
                            }}
                            className="size-7 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
                            aria-label="Dismiss notification"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </aside>
    );
};
