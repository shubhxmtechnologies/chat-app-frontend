import {
    useEffect,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    getUserChats,
} from "../api/chat.api";

import { useAuth } from "../context/AuthContext";
import { usePresence } from "../context/PresenceContext";
import { getRelativeTime } from "../utils/time.util";
import { socket } from "../socket/socketClient";
import type {
    Chat,
} from "../types/chat.types";
import type { Message } from "../types/message.types"

const ChatList = () => {
    const { isOnline, getLastSeen } = usePresence();
    const navigate =
        useNavigate();

    const { user } = useAuth();

    const [chats, setChats] =
        useState<Chat[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    useEffect(() => {
        const loadChats =
            async () => {
                try {
                    const data =
                        await getUserChats();

                    setChats(data);
                } catch (error) {
                    if (
                        error instanceof Error
                    ) {
                        setError(
                            error.message
                        );
                    } else {
                        setError(
                            "Failed to load chats"
                        );
                    }
                } finally {
                    setLoading(false);
                }
            };

        void loadChats();
    }, []);

    useEffect(() => {
        const handleReceiveMessage = (message: Message) => {
            setChats((prev) => {
                const idx = prev.findIndex((c) => c._id === message.chat);
                if (idx === -1) return prev;

                const chat = prev[idx];
                const updatedChat = {
                    ...chat,
                    lastMessage: message as any,
                    unreadCount:
                        message.sender !== user?.id
                            ? chat.unreadCount + 1
                            : chat.unreadCount,
                };

                const next = [...prev];
                next.splice(idx, 1);
                next.unshift(updatedChat);

                return next;
            });
        };

        const handleMessageSeen = ({
            chatId,
        }: {
            chatId: string;
        }) => {
            setChats((prev) =>
                prev.map((c) =>
                    c._id === chatId ? { ...c, unreadCount: 0 } : c
                )
            );
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("message_seen", handleMessageSeen);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("message_seen", handleMessageSeen);
        };
    }, [user?.id]);

    const getPreview = (
        chat: Chat
    ) => {
        if (!chat.lastMessage) {
            return "No messages yet";
        }

        if (
            chat.lastMessage
                .isDeletedForEveryone
        ) {
            return "Message deleted";
        }

        switch (
        chat.lastMessage
            .messageType
        ) {
            case "text":
                return (
                    chat.lastMessage.text ??
                    ""
                );

            case "image":
                return "📷 Photo";

            case "voice":
                return "🎤 Voice message";

            case "sticker":
                return "😊 Sticker";

            default:
                return "";
        }
    };

    if (loading) {
        return <p>Loading in chatlist...</p>;
    }

    if (error) {
        return <p>{error} in chatlist</p>;
    }

    return (
        <main>
            <div style={{ textAlign: "center", padding: "8px", fontSize: "12px", color: "gray" }}>
                Chat List
            </div>
            {chats.map((chat) => {
                const otherUser =
                    chat.participants.find(
                        (
                            participant
                        ) =>
                            participant._id !==
                            user?.id
                    );

                if (!otherUser) {
                    return null;
                }

                const blocked =
                    chat.blockedByMe ||
                    chat.blockedByThem;

                return (
                    <button
                        key={chat._id}
                        type="button"
                        disabled={blocked}
                        onClick={() =>
                            navigate(
                                `/chats/${chat._id}`
                            )
                        }
                        style={{
                            opacity:
                                blocked
                                    ? 0.5
                                    : 1,
                        }}
                    >
                        <img
                            src={
                                otherUser.avatarUrl ??
                                "/default-avatar.png"
                            }
                            alt={
                                otherUser.username
                            }
                            width={50}
                            height={50}
                        />

                        <div>
                            <h3>
                                {
                                    otherUser.username
                                }
                            </h3>

                            <p style={{ fontSize: "12px", color: isOnline(otherUser._id) ? "#16a34a" : "gray" }}>
                                {isOnline(otherUser._id)
                                    ? "Online"
                                    : getRelativeTime(getLastSeen(otherUser._id, otherUser.lastSeenAt))}
                            </p>

                            <p>
                                {getPreview(
                                    chat
                                )}
                            </p>
                        </div>

                        {chat.unreadCount >
                            0 && (
                                <span>
                                    {
                                        chat.unreadCount
                                    }
                                </span>
                            )}
                    </button>
                );
            })}
        </main>
    );
};

export default ChatList;