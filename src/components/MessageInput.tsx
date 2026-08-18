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

const generateId = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

interface Props {
    replyingTo?: { _id: string, text: string | null, messageType: string } | null;
    onCancelReply?: () => void;
    onSend: (text: string, clientMessageId: string) => void;
    onSendMedia?: (
        file: File,
        previewUrl: string,
        clientMessageId: string,
        messageType?: "image" | "voice"
    ) => void;
    onTyping: () => void;
    onStopTyping: () => void;
    onFocus?: () => void;
    blockedByMe?: boolean;
    blockedByThem?: boolean;
    onUnblock?: () => void;
    disabled?: boolean;
    disableVoice?: boolean;
    disableMedia?: boolean;
}

const MessageInput = ({
    replyingTo,
    onCancelReply,
    onSend,
    onSendMedia,
    onTyping,
    onStopTyping,
    onFocus,
    blockedByMe,
    blockedByThem,
    onUnblock,
    disabled = false,
    disableVoice = false,
    disableMedia = false,
}: Props) => {
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [showVoice, setShowVoice] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
                onSendMedia(file, preview, generateId());
                cancelFile();
                onStopTyping();
                setTimeout(() => inputRef.current?.focus(), 0);
                return;
            } catch (error) {
                console.error("Failed to send media:", error);
            }
        }

        const value = text.trim();
        if (!value) return;

        onSend(value, generateId());
        setText("");
        onStopTyping();
        setTimeout(() => inputRef.current?.focus(), 0);
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
            autoComplete="off"
            noValidate
            data-form-type="other"
            data-lpignore="true"
            className={cn(
                "flex flex-col gap-1.5 w-full relative p-1.5 sm:p-2 rounded-[28px] transition-all duration-300 shadow-md border",
                isDragging ? "bg-primary/5 border-primary ring-2 ring-primary/50" : "bg-card border-border/70"
            )}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[28px] bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary/60 text-primary font-medium pointer-events-none">
                    Drop your image here
                </div>
            )}

            {/* Reply Preview Box */}
            {replyingTo && (
                <div className="flex items-center justify-between px-3 py-1.5 mx-1 rounded-2xl bg-primary/10 border-l-4 border-primary min-w-0 max-w-full overflow-hidden">
                    <div className="flex flex-col overflow-hidden min-w-0 flex-1 mr-2">
                        <span className="text-xs font-semibold text-primary">Replying to message</span>
                        <span className="text-sm truncate break-all text-muted-foreground">
                            {replyingTo.messageType === "text"
                                ? (replyingTo.text && replyingTo.text.length > 80 ? `${replyingTo.text.slice(0, 80)}…` : replyingTo.text)
                                : `[${replyingTo.messageType === "voice" ? "Voice message" : replyingTo.messageType === "image" ? "Photo" : replyingTo.messageType}]`}
                        </span>
                    </div>
                    <button type="button" onClick={onCancelReply} className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-muted-foreground transition-colors shrink-0">
                        <X className="size-4" />
                    </button>
                </div>
            )}
            {/* Voice Recorder Overlay */}
            {showVoice && (
                <div className="p-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 mx-1 mb-0.5">
                    <VoiceRecorder
                        onSendVoice={handleSendVoice}
                        onCancel={() => setShowVoice(false)}
                    />
                </div>
            )}

            {/* Selected File Image Preview */}
            {preview && !showVoice && (
                <div className="relative inline-block w-fit mx-2 my-1 group">
                    <img
                        src={preview}
                        alt="Attachment preview"
                        className="max-h-24 max-w-40 rounded-xl object-cover border border-border shadow-md"
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
            <div className="flex items-center gap-1 w-full">
                {!disableMedia && (
                    <>
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
                            className="size-9 rounded-full text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors shrink-0"
                        >
                            <ImageIcon className="size-4" />
                        </Button>
                    </>
                )}

                {/* Voice Note Button */}
                {!disableVoice && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={showVoice || Boolean(file) || text.length > 0 || disabled}
                        onClick={() => setShowVoice(true)}
                        aria-label="Record voice message"
                        className="size-9 rounded-full text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-colors shrink-0"
                    >
                        <Mic className="size-4" />
                    </Button>
                )}

                {/* Main Text Input (textarea to block password managers) */}
                {!showVoice && (
                    <>
                        <textarea
                            ref={inputRef}
                            name="txt_compose_area"
                            id="txt_compose_area"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="sentences"
                            spellCheck={true}
                            data-lpignore="true"
                            data-1p-ignore="true"
                            data-1password-ignore="true"
                            data-form-type="other"
                            enterKeyHint="send"
                            role="textbox"
                            rows={1}
                            placeholder="Type a message..."
                            value={text}
                            onFocus={onFocus}
                            onChange={(e) => {
                                setText(e.target.value.replace(/\n/g, ""));
                                onTyping();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    submit(e as unknown as FormEvent);
                                }
                            }}
                            disabled={Boolean(file) || disabled}
                            className="flex-1 bg-transparent px-2 text-[14px] leading-9 h-9 text-foreground placeholder:text-muted-foreground outline-none border-none disabled:opacity-50 resize-none overflow-hidden whitespace-nowrap scrollbar-none"
                        />

                        {/* Centered Vibrant Send Button */}
                        <Button
                            type="submit"
                            size="icon"
                            disabled={!text.trim() && !file}
                            onMouseDown={(e) => {
                                // Keep focus in input to prevent keyboard from closing
                                e.preventDefault();
                            }}
                            aria-label="Send message"
                            className={cn(
                                "size-9 rounded-full shrink-0 transition-all duration-200 shadow-sm flex items-center justify-center",
                                text.trim() || file
                                    ? "bg-gradient-chat-sender text-white hover:opacity-95 hover:scale-105 active:scale-95 shadow-indigo-500/25 cursor-pointer"
                                    : "bg-muted/80 text-muted-foreground/60 opacity-60 cursor-not-allowed"
                            )}
                        >
                            <Send className="size-4 -ml-0.5 mt-0.5" />
                        </Button>
                    </>
                )}
            </div>
        </form>
    );
};

export default MessageInput;