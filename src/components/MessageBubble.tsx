import type { Message } from "../types/message.types";

interface Props {
    message: Message;

    isMine: boolean;
}

const MessageBubble = ({
    message,
    isMine,
}: Props) => {
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
                {message.text}
            </div>
        </div>
    );
};

export default MessageBubble;