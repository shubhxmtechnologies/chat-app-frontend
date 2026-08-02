import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getMessages } from "../api/message.api";
import { useAuth } from "../context/AuthContext";
import { useChatSocket } from "../hooks/useChatSocket";

import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";

import type { Message } from "../types/message.types";

const ChatView = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const { user } = useAuth();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!chatId) return;

        const loadMessages = async () => {
            try {
                setLoading(true);
                const data = await getMessages(chatId);
                setMessages(data.slice().reverse()); // backend returns newest-first
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load messages");
            } finally {
                setLoading(false);
            }
        };

        void loadMessages();
    }, [chatId]);

    const { sendMessage } = useChatSocket({
        chatId: chatId ?? "",
        currentUserId: user?.id ?? "",
        setMessages,
    });

    if (!chatId) return null;
    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;

    return (
        <main>
            <div>
                {messages.map((message) => (
                    <MessageBubble
                        key={message._id}
                        message={message}
                        isMine={message.sender === user?.id}
                    />
                ))}
            </div>

            <MessageInput onSend={sendMessage} />
        </main>
    );
};

export default ChatView;