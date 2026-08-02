import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import { getUserChats } from "../api/chat.api";
import { getMessages } from "../api/message.api";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../hooks/useChatSocket";
import { socket } from "../socket/socketClient";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { usePresence } from "../context/PresenceContext";
import { getRelativeTime } from "../utils/time.util";
import type { Chat } from "../types/chat.types";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";

import type { Message } from "../types/message.types";

const ChatView = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const { handleTyping, stopTyping } = useTypingIndicator(chatId ?? "");
    const { isOnline, getLastSeen } = usePresence();
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [showNewMessagePill, setShowNewMessagePill] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const previousScrollHeightRef = useRef<number>(0);
    const isNearBottomRef = useRef<boolean>(true);
    const isInitialLoadRef = useRef<boolean>(true);
    const lastMessageIdRef = useRef<string | null>(null);
    useEffect(() => {
        if (!chatId) return;

        const loadMessagesAndChat = async () => {
            try {
                isInitialLoadRef.current = true;
                setLoading(true);
                const [messagesData, chatsData] = await Promise.all([
                    getMessages(chatId),
                    getUserChats()
                ]);
                setMessages(messagesData.messages.slice().reverse());
                setNextCursor(messagesData.nextCursor);
                setChat(chatsData.find(c => c._id === chatId) || null);
                socket.emit("mark_seen", chatId);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load messages");
            } finally {
                setLoading(false);
            }
        };

        void loadMessagesAndChat();
    }, [chatId]);

    const { sendMessage, sendMedia } = useChatSocket({
        chatId: chatId ?? "",
        currentUserId: user?.id ?? "",
        setMessages,
    });

    useEffect(() => {
        if (!chatId) return;

        const handleUserTyping = ({ chatId: eventChatId, userId: typingUserId }: { chatId: string, userId: string }) => {
            if (eventChatId === chatId && typingUserId !== user?.id) {
                setIsTyping(true);
            }
        };

        const handleUserStopTyping = ({ chatId: eventChatId, userId: typingUserId }: { chatId: string, userId: string }) => {
            if (eventChatId === chatId && typingUserId !== user?.id) {
                setIsTyping(false);
            }
        };

        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);

        return () => {
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
            setIsTyping(false);
        };
    }, [chatId, user?.id]);

    const scrollToBottom = () => {
        try {
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
                isNearBottomRef.current = true;
                setShowNewMessagePill(false);
            }
        } catch (error) {
            console.error("Failed to scroll to bottom:", error);
        }
    };

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        try {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;

            if (isNearBottomRef.current) {
                setShowNewMessagePill(false);
            }
        } catch (error) {
            console.error("Failed to compute scroll position:", error);
        }

        if (!chatId || !nextCursor || loadingOlder) return;

        if (e.currentTarget.scrollTop < 100) {
            try {
                setLoadingOlder(true);
                const data = await getMessages(chatId, nextCursor);

                if (containerRef.current) {
                    previousScrollHeightRef.current = containerRef.current.scrollHeight;
                }

                setMessages((prev) => [...data.messages.slice().reverse(), ...prev]);
                setNextCursor(data.nextCursor);
            } catch (err) {
                console.error("Failed to load older messages:", err);
            } finally {
                setLoadingOlder(false);
            }
        }
    };

    useLayoutEffect(() => {
        try {
            if (previousScrollHeightRef.current > 0 && containerRef.current) {
                const diff = containerRef.current.scrollHeight - previousScrollHeightRef.current;
                containerRef.current.scrollTop += diff;
                previousScrollHeightRef.current = 0;
            }
        } catch (error) {
            console.error("Failed to preserve scroll position", error);
        }
    }, [messages.length]);

    useLayoutEffect(() => {
        try {
            if (messages.length === 0) return;

            const currentLastMessageId = messages[messages.length - 1]?._id;

            if (isInitialLoadRef.current) {
                scrollToBottom();
                isInitialLoadRef.current = false;
                lastMessageIdRef.current = currentLastMessageId;
                return;
            }

            if (currentLastMessageId !== lastMessageIdRef.current) {
                lastMessageIdRef.current = currentLastMessageId;

                if (isNearBottomRef.current) {
                    scrollToBottom();
                } else {
                    setShowNewMessagePill(true);
                }
            }
        } catch (error) {
            console.error("Auto-scroll failed", error);
        }
    }, [messages]);

    if (!chatId) return null;

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    const otherUser = chat?.participants.find((p) => p._id !== user?.id);
    const online = otherUser ? isOnline(otherUser._id) : false;
    return (
        <main>
            {otherUser && (
                <header style={{ paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #ccc" }}>
                    <h2 style={{ margin: 0 }}>{otherUser.username}</h2>
                    <p style={{ margin: 0, fontSize: "12px", color: online ? "#16a34a" : "gray" }}>
                        {online ? "Online" : getRelativeTime(getLastSeen(otherUser._id, otherUser.lastSeenAt))}
                    </p>
                </header>
            )}

            <div style={{ position: "relative" }}>
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    style={{ overflowY: "auto", maxHeight: "60vh", display: "flex", flexDirection: "column" }}
                >
                    {loadingOlder && (
                        <div style={{ textAlign: "center", padding: "8px", fontSize: "12px", color: "gray" }}>
                            Loading older messages...
                        </div>
                    )}
                    {messages.map((message) => (
                        <MessageBubble
                            key={message._id}
                            message={message}
                            isMine={message.sender === user?.id}
                        />
                    ))}
                </div>

                {showNewMessagePill && (
                    <button
                        onClick={scrollToBottom}
                        type="button"
                        style={{
                            position: "absolute",
                            bottom: "16px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            padding: "6px 12px",
                            borderRadius: "16px",
                            backgroundColor: "#0ea5e9",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                            fontSize: "12px",
                            fontWeight: "bold",
                            zIndex: 10
                        }}
                    >
                        ↓ New message
                    </button>
                )}
            </div>

            {isTyping && <p style={{ fontSize: "12px", color: "gray", fontStyle: "italic", marginBottom: "8px" }}>Typing...</p>}

            <MessageInput
                onSendMedia={sendMedia}
                onSend={sendMessage}
                onTyping={handleTyping}
                onStopTyping={stopTyping}
            />
        </main>
    );
};

export default ChatView;