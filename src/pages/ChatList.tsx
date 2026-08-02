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

import type {
    Chat,
} from "../types/chat.types";

const ChatList = () => {
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
        return <p>Loading...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <main>
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