import { useEffect, type Dispatch, type SetStateAction } from "react";

import { socket } from "../socket/socketClient";

import type { Message } from "../types/message.types";

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
        };

        socket.on(
            "receive_message",
            handleReceive
        );

        return () => {
            socket.off(
                "receive_message",
                handleReceive
            );
        };
    }, [chatId, setMessages]);

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

    return {
        sendMessage,
    };
};