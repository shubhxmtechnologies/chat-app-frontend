import {
    useState,
    useRef,
    type FormEvent,
} from "react";

import StickerPicker from "./StickerPicker";
import VoiceRecorder from "./VoiceRecorder";
import EmojiPicker from "./EmojiPicker";
interface Props {
    onSend: (
        text: string,
        clientMessageId: string
    ) => void;
    onSendMedia?: (
        file: File,
        previewUrl: string,
        clientMessageId: string,
        messageType?: "image" | "sticker" | "voice"
    ) => void;
    onTyping: () => void;
    onStopTyping: () => void;
}

const MessageInput = ({
    onSend,
    onSendMedia,
    onTyping,
    onStopTyping,
}: Props) => {
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [showStickers, setShowStickers] = useState(false);
    const [showVoice, setShowVoice] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const handleEmojiSelect = (emoji: string) => {
        try {
            if (inputRef.current) {
                const start = inputRef.current.selectionStart ?? text.length;
                const end = inputRef.current.selectionEnd ?? text.length;

                const newText = text.substring(0, start) + emoji + text.substring(end);
                setText(newText);

                window.setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.setSelectionRange(start + emoji.length, start + emoji.length);
                    }
                }, 0);
            } else {
                setText((prev) => prev + emoji);
            }
            onTyping();
        } catch (error) {
            console.error("Failed to insert emoji:", error);
        }
    };


    const handleSendVoice = (voiceFile: File, voiceUrl: string, clientMessageId: string) => {
        try {
            if (onSendMedia) {
                onSendMedia(voiceFile, voiceUrl, clientMessageId, "voice");
                setShowVoice(false);
                onStopTyping();
            }
        } catch (error) {
            console.error("Failed to trigger voice send:", error);
        }
    };

    const handleSendSticker = (stickerFile: File, stickerUrl: string, clientMessageId: string) => {
        try {
            if (onSendMedia) {
                onSendMedia(stickerFile, stickerUrl, clientMessageId, "sticker");
                setShowStickers(false);
                onStopTyping();
            }
        } catch (error) {
            console.error("Failed to trigger sticker send:", error);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const f = e.target.files?.[0];
            if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
            }
        } catch (error) {
            console.error("Failed to load file preview:", error);
        }
    };

    const cancelFile = () => {
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
    };

    const submit = (
        e: FormEvent
    ) => {
        e.preventDefault();

        if (file && preview && onSendMedia) {
            try {
                onSendMedia(file, preview, crypto.randomUUID());
                cancelFile();
                onStopTyping();
                return;
            } catch (error) {
                console.error("Failed to send media:", error);
            }
        }

        const value = text.trim();

        if (!value) {
            return;
        }

        onSend(
            value,
            crypto.randomUUID()
        );

        setText("");
        onStopTyping();
    };

    return (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column" }}>
            {showStickers && !showVoice && (
                <StickerPicker onSendSticker={handleSendSticker} />
            )}

            {showEmojis && !showVoice && (
                <EmojiPicker onSelect={handleEmojiSelect} />
            )}

            {showVoice && (
                <div style={{ marginBottom: "8px" }}>
                    <VoiceRecorder onSendVoice={handleSendVoice} onCancel={() => setShowVoice(false)} />
                </div>
            )}

            {preview && !showVoice && (
                <div style={{ position: "relative", width: "fit-content", marginBottom: "8px" }}>
                    <img src={preview} alt="preview" style={{ maxWidth: "100px", borderRadius: "8px" }} />
                    <button
                        type="button"
                        onClick={cancelFile}
                        style={{ position: "absolute", top: 0, right: 0, background: "red", color: "white", borderRadius: "50%", border: "none", cursor: "pointer" }}
                    >
                        ×
                    </button>
                </div>
            )}

            <div style={{ display: "flex", alignItems: "center" }}>
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    ref={fileRef}
                    onChange={handleFileChange}
                />
                <button type="button" onClick={() => fileRef.current?.click()} style={{ marginRight: "8px" }}>
                    +
                </button>

                <button
                    type="button"
                    onClick={() => { setShowStickers((prev) => !prev); setShowEmojis(false); }}
                    style={{ marginRight: "8px" }}
                    disabled={showVoice}
                >
                    🖼️
                </button>

                <button
                    type="button"
                    onClick={() => { setShowEmojis((prev) => !prev); setShowStickers(false); }}
                    style={{ marginRight: "8px" }}
                    disabled={showVoice}
                >
                    😀
                </button>

                <button
                    type="button"
                    onClick={() => setShowVoice(true)}
                    style={{ marginRight: "8px" }}
                    disabled={showVoice || !!file || text.length > 0}
                >
                    🎤
                </button>

                {!showVoice && (
                    <>
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                onTyping();
                            }}
                            disabled={!!file}
                            style={{ flex: 1, marginRight: "8px" }}
                        />

                        <button type="submit" disabled={!text.trim() && !file}>
                            Send
                        </button>
                    </>
                )}
            </div>
        </form>
    );
};

export default MessageInput;