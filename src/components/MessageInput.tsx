import {
    useState,
    useRef,
    type FormEvent,
} from "react";
import {
    Send,
    Plus,
    Smile,
    Image as ImageIcon,
    Mic,
    X,
    Sparkles,
} from "lucide-react";

import StickerPicker from "./StickerPicker";
import VoiceRecorder from "./VoiceRecorder";
import EmojiPicker from "./EmojiPicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    onSend: (text: string, clientMessageId: string) => void;
    onSendMedia?: (
        file: File,
        previewUrl: string,
        clientMessageId: string,
        messageType?: "image" | "sticker" | "voice"
    ) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    blockedByMe?: boolean;
    blockedByThem?: boolean;
    onUnblock?: () => void;
}

const MessageInput = ({
    onSend,
    onSendMedia,
    onTyping,
    onStopTyping,
    blockedByMe,
    blockedByThem,
    onUnblock,
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

    const submit = (e: FormEvent) => {
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
        if (!value) return;

        onSend(value, crypto.randomUUID());
        setText("");
        onStopTyping();
    };

    if (blockedByMe || blockedByThem) {
        return (
            <div className="p-4 rounded-xl text-center bg-muted/60 border border-border/80 text-muted-foreground text-xs">
                {blockedByMe ? (
                    <div className="flex items-center justify-center gap-2">
                        <span>You&apos;ve blocked this conversation.</span>
                        <Button
                            variant="link"
                            size="sm"
                            type="button"
                            onClick={onUnblock}
                            className="text-primary font-semibold p-0 h-auto text-xs"
                        >
                            Unblock user
                        </Button>
                    </div>
                ) : (
                    <span>You can no longer send messages to this conversation.</span>
                )}
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="flex flex-col gap-2 w-full">
            {/* Sticker / Emoji Panels */}
            {showStickers && !showVoice && (
                <div className="p-2 rounded-xl border border-border bg-card shadow-lg mb-1">
                    <StickerPicker onSendSticker={handleSendSticker} />
                </div>
            )}

            {showEmojis && !showVoice && (
                <div className="p-2 rounded-xl border border-border bg-card shadow-lg mb-1">
                    <EmojiPicker onSelect={handleEmojiSelect} />
                </div>
            )}

            {/* Voice Recorder Overlay */}
            {showVoice && (
                <div className="p-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 mb-1">
                    <VoiceRecorder
                        onSendVoice={handleSendVoice}
                        onCancel={() => setShowVoice(false)}
                    />
                </div>
            )}

            {/* Selected File Image Preview */}
            {preview && !showVoice && (
                <div className="relative inline-block w-fit mb-1 group">
                    <img
                        src={preview}
                        alt="Attachment preview"
                        className="max-h-24 max-w-[160px] rounded-xl object-cover border border-border shadow-md"
                    />
                    <button
                        type="button"
                        onClick={cancelFile}
                        className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                        aria-label="Remove image"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            )}

            {/* Input Toolbar */}
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/80 shadow-xs focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileRef}
                    onChange={handleFileChange}
                />

                {/* Attach Photo Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Attach photo"
                    className="size-9 rounded-xl text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors shrink-0"
                >
                    <ImageIcon className="size-4" />
                </Button>

                {/* Stickers Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={showVoice}
                    onClick={() => {
                        setShowStickers((prev) => !prev);
                        setShowEmojis(false);
                    }}
                    aria-label="Stickers"
                    className="size-9 rounded-xl text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 transition-colors shrink-0"
                >
                    <Sparkles className="size-4" />
                </Button>

                {/* Emojis Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={showVoice}
                    onClick={() => {
                        setShowEmojis((prev) => !prev);
                        setShowStickers(false);
                    }}
                    aria-label="Emoji Picker"
                    className="size-9 rounded-xl text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors shrink-0"
                >
                    <Smile className="size-4" />
                </Button>

                {/* Voice Note Button */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={showVoice || Boolean(file) || text.length > 0}
                    onClick={() => setShowVoice(true)}
                    aria-label="Record voice message"
                    className="size-9 rounded-xl text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-colors shrink-0"
                >
                    <Mic className="size-4" />
                </Button>

                {/* Main Text Input */}
                {!showVoice && (
                    <>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type an encrypted message..."
                            value={text}
                            onChange={(e) => {
                                setText(e.target.value);
                                onTyping();
                            }}
                            disabled={Boolean(file)}
                            className="flex-1 bg-transparent px-2 text-[14px] text-foreground placeholder:text-muted-foreground outline-none border-none"
                        />

                        {/* Vibrant Gradient Send Button */}
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!text.trim() && !file}
                            aria-label="Send message"
                            className={cn(
                                "size-9 rounded-xl shrink-0 transition-all duration-200 shadow-sm",
                                text.trim() || file
                                    ? "bg-gradient-chat-sender text-white hover:opacity-95 hover:scale-105 active:scale-95 cursor-pointer"
                                    : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Send className="size-4" />
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
};

export default MessageInput;