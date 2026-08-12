import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

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

import { useAuth } from "../context/AuthContext";
import { playSendSound, playReceiveSound } from "../utils/sound.util";

export const useChatSocket = ({
    chatId,
    currentUserId,
    setMessages,
}: Props) => {
    const { user } = useAuth();
    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        socket.emit("join_chat", chatId);
        socket.emit("mark_seen", chatId);

        const handleReceive = (
            message: Message
        ) => {
            if (message.chat !== chatId) {
                if (message.sender !== currentUserId) {
                    try {
                        const currentUser = userRef.current;
                        if (!currentUser?.globalMute && !currentUser?.mutedChats?.includes(message.chat)) {
                            playReceiveSound();
                        }
                    } catch (e) {}
                }
                return;
            }

            setMessages((previous) => {
                if (message.sender !== currentUserId) {
                    try {
                        const currentUser = userRef.current;
                        if (!currentUser?.globalMute && !currentUser?.mutedChats?.includes(message.chat)) {
                            playReceiveSound();
                        }
                    } catch (e) { }
                }
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
                            ? {
                                  ...message,
                                  status: m.status === 'seen' ? 'seen' : message.status,
                                  seenAt: m.seenAt || message.seenAt,
                              }
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
            clientMessageIds = [],
            seenAt,
        }: {
            chatId: string;
            messageIds: string[];
            clientMessageIds?: string[];
            seenAt: string;
        }) => {
            if (eventChatId !== chatId) return;

            setMessages((previous) =>
                previous.map((m) =>
                    messageIds.includes(m._id) || (m.clientMessageId && clientMessageIds.includes(m.clientMessageId))
                        ? { ...m, status: "seen", seenAt }
                        : m
                )
            );
        };



        const handleMessageEdited = (editedMessage: Message) => {
            setMessages((previous) =>
                previous.map((m) =>
                    m._id === editedMessage._id ? editedMessage : m
                )
            );
        };

        const handleMessageDeletedForEveryone = ({ messageId }: { messageId: string }) => {
            try {
                setMessages((previous) =>
                    previous.map((m) =>
                        m._id === messageId
                            ? { ...m, isDeletedForEveryone: true, text: null, mediaUrl: null }
                            : m
                    )
                );
            } catch (error) {
                console.error("Failed to process deleted message:", error);
            }
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
            "message_edited",
            handleMessageEdited
        );

        socket.on(
            "message_deleted_for_everyone",
            handleMessageDeletedForEveryone
        );


        return () => {
            socket.emit("leave_chat", chatId);
            socket.off(
                "receive_message",
                handleReceive
            );
            socket.off(
                "message_seen",
                handleMessageSeen
            );

            socket.off(
                "message_edited",
                handleMessageEdited
            );
            socket.off(
                "message_deleted_for_everyone",
                handleMessageDeletedForEveryone
            );
        };
    }, [chatId, currentUserId, setMessages]);

    const sendMessage = (
        text: string,
        clientMessageId: string,
        replyTo?: { _id: string, text: string | null, messageType: string } | null
    ) => {
        playSendSound();
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

            replyTo,

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
                return previous.map((m) =>
                    m.clientMessageId === clientMessageId
                        ? { ...m, status: "sending" }
                        : m
                );
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
        }, 10000);


        socket.emit(
            "send_message",
            {
                chatId,
                text,
                clientMessageId,
                replyTo: replyTo?._id,
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
                        previous.map((m) =>
                            m.clientMessageId === clientMessageId
                                ? { ...m, status: "failed" }
                                : m
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
                                ? {
                                      ...response.message!,
                                      status: m.status === 'seen' ? 'seen' : response.message!.status,
                                      seenAt: m.seenAt || response.message!.seenAt,
                                  }
                                : m
                        )
                    );
            }
        );
    };

    const sendMedia = async (
        file: File,
        previewUrl: string,
        clientMessageId: string,
        messageType: "image" | "voice" = "image",
        replyTo?: { _id: string, text: string | null, messageType: string } | null
    ) => {
        playSendSound();
        const optimistic: Message = {
            _id: clientMessageId,
            chat: chatId,
            sender: currentUserId,
            messageType,
            text: null,
            mediaUrl: previewUrl,
            replyTo,
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
            const response = await sendMediaMessage(chatId, messageType, file, clientMessageId, replyTo?._id);
            setMessages((prev) =>
                prev.map((m) =>
                    m.clientMessageId === clientMessageId ? {
                        ...response.message,
                        status: m.status === 'seen' ? 'seen' : response.message.status,
                        seenAt: m.seenAt || response.message.seenAt,
                    } : m
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

    const retryMessage = (failedMessage: Message) => {
        if (!failedMessage.clientMessageId) return;

        if (failedMessage.messageType === "text" && failedMessage.text) {
            sendMessage(failedMessage.text, failedMessage.clientMessageId);
        } else if (
            failedMessage.mediaUrl &&
            (failedMessage.messageType === "image" ||
                failedMessage.messageType === "voice")
        ) {
            fetch(failedMessage.mediaUrl)
                .then((res) => res.blob())
                .then((blob) => {
                    const ext = failedMessage.messageType === "voice" ? "webm" : "png";
                    const mime = failedMessage.messageType === "voice" ? "audio/webm" : blob.type;
                    const file = new File([blob], `retry.${ext}`, { type: mime });
                    sendMedia(file, failedMessage.mediaUrl!, failedMessage.clientMessageId!, failedMessage.messageType as "image" | "voice");
                })
                .catch((err) => console.error("Retry failed:", err));
        }
    };

    return {
        sendMessage,
        sendMedia,
        retryMessage,
    };
};