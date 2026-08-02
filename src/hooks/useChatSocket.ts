import { useEffect, type Dispatch, type SetStateAction } from "react";

import { socket } from "../socket/socketClient";

import type { Message } from "../types/message.types";
import { sendMediaMessage } from "../api/message.api";
interface Props {
    chatId: string;

    currentUserId: string;

    setMessages: Dispatch<
        SetStateAction<Message[]>
    >;
}

export const useChatSocket = ({
    chatId,
    currentUserId,
    setMessages,
}: Props) => {
    useEffect(() => {
        socket.emit("join_chat", chatId);

        const handleReceive = (
            message: Message
        ) => {
            if (message.chat !== chatId) {
                return;
            }

            setMessages((previous) => {
                /*
                 * Already have this real message?
                 */
                if (
                    previous.some(
                        (m) =>
                            m._id ===
                            message._id
                    )
                ) {
                    return previous;
                }

                /*
                 * Replace optimistic bubble.
                 */
                const optimistic =
                    previous.find(
                        (m) =>
                            m.clientMessageId &&
                            m.clientMessageId ===
                            message.clientMessageId
                    );

                if (optimistic) {
                    return previous.map((m) =>
                        m.clientMessageId ===
                            message.clientMessageId
                            ? message
                            : m
                    );
                }

                /*
                 * Recipient receives here.
                 */
                return [...previous, message];
            });
            if (message.sender !== currentUserId) {
                socket.emit("mark_seen", chatId);
            }
        };
        const handleMessageSeen = ({
            chatId: eventChatId,
            messageIds,
            seenAt,
        }: {
            chatId: string;
            messageIds: string[];
            seenAt: string;
        }) => {
            if (eventChatId !== chatId) return;

            setMessages((previous) =>
                previous.map((m) =>
                    messageIds.includes(m._id)
                        ? { ...m, status: "seen", seenAt }
                        : m
                )
            );
        };

        const handleMessageDelivered = ({
            messageId,
            deliveredAt,
        }: {
            messageId: string;
            deliveredAt: string;
        }) => {
            setMessages((previous) =>
                previous.map((m) =>
                    m._id === messageId && m.status !== "seen"
                        ? { ...m, status: "delivered", deliveredAt }
                        : m
                )
            );
        };


        socket.on(
            "receive_message",
            handleReceive
        );

        socket.on(
            "message_seen",
            handleMessageSeen
        );

        socket.on(
            "message_delivered",
            handleMessageDelivered
        );


        return () => {
            socket.off(
                "receive_message",
                handleReceive
            );
            socket.off(
                "message_seen",
                handleMessageSeen
            );
            socket.off(
                "message_delivered",
                handleMessageDelivered
            );
        };
    }, [chatId, currentUserId, setMessages]);

    const sendMessage = (
        text: string,
        clientMessageId: string
    ) => {
        /*
         * Immediately show the bubble.
         */
        const optimistic: Message = {
            _id: clientMessageId,

            chat: chatId,

            sender: currentUserId,

            messageType: "text",

            text,

            mediaUrl: null,

            status: "sending",

            clientMessageId,

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString(),

            isEdited: false,

            editedAt: null,

            isDeletedForEveryone: false,

            deletedAt: null,
        };

        setMessages((previous) => {
            const alreadyExists = previous.some(
                (message) =>
                    message.clientMessageId ===
                    clientMessageId
            );

            if (alreadyExists) {
                return previous;
            }

            return [
                ...previous,
                optimistic,
            ];
        });

        const timeout = window.setTimeout(() => {
            setMessages((previous) =>
                previous.map((message) =>
                    message.clientMessageId ===
                        clientMessageId
                        ? {
                            ...message,
                            status: "failed",
                        }
                        : message
                )
            );
        }, 30000);


        socket.emit(
            "send_message",
            {
                chatId,
                text,
                clientMessageId,
            },
            (
                response: {
                    success: boolean;

                    message?: Message;

                    error?: string;
                }
            ) => {
                if (!response.success) {
                    clearTimeout(timeout);
                    setMessages((previous) =>
                        previous.filter(
                            (m) =>
                                m.clientMessageId !==
                                clientMessageId
                        )
                    );

                    console.error(
                        response.error
                    );

                    return;
                }

                /*
                 * Replace optimistic message.
                 */
                clearTimeout(timeout);
                setMessages((previous) =>
                    previous.map((m) =>
                        m.clientMessageId ===
                            clientMessageId
                            ? response.message!
                            : m
                    )
                );
            }
        );
    };

    const sendMedia = async (file: File, previewUrl: string, clientMessageId: string, messageType: "image" | "sticker" | "voice" = "image") => {
        const optimistic: Message = {
            _id: clientMessageId,
            chat: chatId,
            sender: currentUserId,
            messageType,
            text: null,
            mediaUrl: previewUrl,
            status: "sending",
            clientMessageId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isEdited: false,
            editedAt: null,
            isDeletedForEveryone: false,
            deletedAt: null,
        };

        setMessages((prev) => {
            if (prev.some((m) => m.clientMessageId === clientMessageId)) return prev;
            return [...prev, optimistic];
        });

        try {
            const response = await sendMediaMessage(chatId, messageType, file, clientMessageId);
            setMessages((prev) =>
                prev.map((m) =>
                    m.clientMessageId === clientMessageId ? response.message : m
                )
            );
        } catch (error) {
            console.error("Media send failed:", error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.clientMessageId === clientMessageId
                        ? { ...m, status: "failed" }
                        : m
                )
            );
        }
    };

    return {
        sendMessage,
        sendMedia,
    };
};