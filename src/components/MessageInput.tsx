import {
    useState,
    type FormEvent,
} from "react";

interface Props {
    onSend: (
        text: string,
        clientMessageId: string
    ) => void;
}

const MessageInput = ({
    onSend,
}: Props) => {
    const [text, setText] =
        useState("");

    const submit = (
        e: FormEvent
    ) => {
        e.preventDefault();

        const value = text.trim();

        if (!value) {
            return;
        }

        onSend(
            value,
            crypto.randomUUID()
        );

        setText("");
    };

    return (
        <form onSubmit={submit}>
            <input
                value={text}
                onChange={(e) =>
                    setText(
                        e.target.value
                    )
                }
            />

            <button type="submit" disabled={!text.trim()}>
                Send
            </button>
        </form>
    );
};

export default MessageInput;