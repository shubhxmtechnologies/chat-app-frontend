import {
    useState,
    useRef,
    type FormEvent,
    useEffect,
} from "react";
import {
    Send,
    Mic,
    X,
    Image as ImageIcon,
} from "lucide-react";

import VoiceRecorder from "./VoiceRecorder";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    replyingTo?: { _id: string, text: string | null, messageType: string } | null;
    onCancelReply?: () => void;
    onSend: (text: string, clientMessageId: string) => void;
    onSendMedia?: (
        file: File,
        previewUrl: string,
        messageType?: "image" | "voice"
    ) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    blockedByMe?: boolean;
    blockedByThem?: boolean;
    onUnblock?: () => void;
}

const MessageInput = ({
    replyingTo,
    onCancelReply,
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
    const [showVoice, setShowVoice] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (replyingTo && inputRef.current) {
            inputRef.current.focus();
        }
    }, [replyingTo]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile && droppedFile.type.startsWith("image/")) {
            setFile(droppedFile);
            setPreview(URL.createObjectURL(droppedFile));
            setTimeout(() => inputRef.current?.focus(), 0);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const f = e.target.files?.[0];
            if (f) {
                setFile(f);
                setPreview(URL.createObjectURL(f));
                setTimeout(() => inputRef.current?.focus(), 0);
            }
        } catch (error) {
            console.error("Failed to load file preview:", error);
        }
    };

    const cancelFile = () => {
        setFile(null);
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
        <form
            onSubmit={submit}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "flex flex-col gap-2 w-full relative p-2.5 rounded-3xl transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border",
                isDragging ? "bg-primary/5 border-primary ring-2 ring-primary/50" : "bg-card border-border/60"
            )}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-3xl bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/60 text-primary font-medium pointer-events-none">
                    Drop your image here
                </div>
            )}
            
            {/* Reply Preview Box */}
            {replyingTo && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-primary/10 border-l-4 border-primary">
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-semibold text-primary">Replying to message</span>
                        <span className="text-sm truncate text-muted-foreground">
                            {replyingTo.messageType === "text" ? replyingTo.text : `[${replyingTo.messageType}]`}
                        </span>
                    </div>
                    <button type="button" onClick={onCancelReply} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-muted-foreground transition-colors">
                        <X className="size-4" />
                    </button>
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
            <div className="flex items-center gap-1.5 p-1 rounded-[20px] bg-transparent focus-within:ring-0 transition-all">
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