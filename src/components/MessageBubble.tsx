import type { Message } from "../types/message.types";

interface Props {
    message: Message;

    isMine: boolean;
}

const MessageBubble = ({
    message,
    isMine,
}: Props) => {
    const timeString = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const renderContent = () => {
        try {
            switch (message.messageType) {
                case "text":
                    return <span>{message.text}</span>;
                case "image":
                case "sticker":
                    return (
                        <div style={{ marginBottom: "4px" }}>
                            <img
                                src={message.mediaUrl!}
                                alt={message.messageType}
                                style={{ maxWidth: "200px", borderRadius: "8px", display: "block" }}
                            />
                        </div>
                    );
                case "voice":
                    return (
                        <div style={{ marginBottom: "4px" }}>
                            <audio src={message.mediaUrl!} controls style={{ height: "40px", maxWidth: "250px" }} />
                        </div>
                    );
                default:
                    return null;
            }
        } catch (error) {
            console.error("Failed to render message content:", error);
            return <span>Error loading content</span>;
        }
    };

    return (
        <div
            style={{
                display: "flex",
                justifyContent: isMine
                    ? "flex-end"
                    : "flex-start",
                marginBottom: "8px",
            }}
        >
            <div>
                {renderContent()}
                <span style={{ marginLeft: "8px", fontSize: "10px", color: "gray" }}>
                    {timeString}
                </span>
                {isMine && (
                    <span style={{ marginLeft: "4px", fontSize: "12px" }}>
                        {message.status === "sending" && <span style={{ opacity: 0.5 }}>🕒</span>}
                        {message.status === "sent" && "✓"}
                        {message.status === "delivered" && "✓✓"}
                        {message.status === "seen" && <span style={{ color: "#0ea5e9" }}>✓✓</span>}
                    </span>
                )}
            </div>
        </div>
    );
};

export default MessageBubble;