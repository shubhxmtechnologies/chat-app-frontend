import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Check,
    CheckCheck,
    Clock,
    RotateCw,
    Trash2,
    Edit2,
    X,
    Check as SaveIcon,
    Volume2,
} from "lucide-react";
import type { Message } from "@/types/message.types";
import { editMessage, deleteMessageForMe, deleteMessageForEveryone } from "@/api/message.api";
import { cn } from "@/lib/utils";

interface Props {
    message: Message;
    isMine: boolean;
    onDeleteLocal: (messageId: string) => void;
    onRetry?: (message: Message) => void;
}

const MessageBubble = ({
    message,
    isMine,
    onDeleteLocal,
    onRetry,
}: Props) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isWithin15Mins =
        Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000;

    const handleDeleteForMe = async () => {
        try {
            setIsDeleting(true);
            await deleteMessageForMe(message._id);
            onDeleteLocal(message._id);
        } catch (error) {
            console.error("Failed to delete for me:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteForEveryone = async () => {
        try {
            setIsDeleting(true);
            await deleteMessageForEveryone(message._id);
        } catch (error) {
            console.error("Failed to delete for everyone:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = async () => {
        const trimmed = editText.trim();
        if (!trimmed || trimmed === message.text) {
            setIsEditing(false);
            setEditText(message.text || "");
            return;
        }
        try {
            setIsSaving(true);
            await editMessage(message._id, trimmed);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to edit message:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            void handleSave();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setEditText(message.text || "");
        }
    };

    const timeString = new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    // Render Deleted message
    if (message.isDeletedForEveryone) {
        return (
            <div
                className={cn(
                    "flex w-full my-1.5",
                    isMine ? "justify-end" : "justify-start"
                )}
            >
                <div
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[13px] italic border",
                        "bg-muted/40 text-muted-foreground border-border/40"
                    )}
                >
                    <Trash2 className="size-3.5 opacity-60" />
                    <span>This message was deleted</span>
                    <span className="text-[10px] opacity-60 ml-1">{timeString}</span>
                </div>
            </div>
        );
    }

    return (
        <div
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            className={cn(
                "group relative flex w-full my-1 transition-all",
                isMine ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "flex flex-col max-w-[82%] sm:max-w-[70%]",
                    isMine ? "items-end" : "items-start"
                )}
            >
                {/* Main Bubble Container */}
                <div
                    className={cn(
                        "relative px-4 py-2.5 text-[14.5px] leading-[1.45] transition-all duration-200 shadow-sm",
                        isMine
                            ? "bg-gradient-chat-sender text-white rounded-[22px] rounded-br-[4px] shadow-indigo-500/10 font-normal"
                            : "bg-card dark:bg-card/90 text-foreground border border-border/80 rounded-[22px] rounded-bl-[4px] shadow-xs"
                    )}
                >
                    {/* Content Rendering based on Type */}
                    {message.messageType === "text" && (
                        <div>
                            {isEditing ? (
                                <div className="flex items-center gap-1.5 my-0.5">
                                    <input
                                        ref={inputRef}
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isSaving}
                                        className="bg-white/20 text-white rounded-lg px-2.5 py-1 text-sm outline-none border border-white/40 focus:ring-2 focus:ring-white/50 min-w-[180px]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="p-1 hover:bg-white/20 rounded-md text-white transition-colors"
                                        title="Save edit"
                                    >
                                        <SaveIcon className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditText(message.text || "");
                                        }}
                                        className="p-1 hover:bg-white/20 rounded-md text-white transition-colors"
                                        title="Cancel edit"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="break-words whitespace-pre-wrap">
                                    {message.text}
                                    {message.isEdited && (
                                        <span
                                            className={cn(
                                                "text-[10px] ml-1.5 opacity-75 font-normal italic",
                                                isMine ? "text-white/80" : "text-muted-foreground"
                                            )}
                                        >
                                            (edited)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Image / Sticker Attachments */}
                    {(message.messageType === "image" || message.messageType === "sticker") && (
                        <div className="rounded-xl overflow-hidden my-0.5 max-w-[260px] sm:max-w-[320px]">
                            <img
                                src={message.mediaUrl!}
                                alt={message.messageType}
                                className="w-full h-auto object-cover rounded-xl shadow-xs transition-transform duration-200 hover:scale-102 cursor-pointer"
                                onClick={() => window.open(message.mediaUrl!, "_blank")}
                            />
                        </div>
                    )}

                    {/* Voice Note Audio Player */}
                    {message.messageType === "voice" && (
                        <div
                            className={cn(
                                "flex items-center gap-3 p-1.5 rounded-xl min-w-[220px]",
                                isMine ? "bg-white/10" : "bg-secondary/70"
                            )}
                        >
                            <div
                                className={cn(
                                    "size-8 rounded-full flex items-center justify-center shrink-0",
                                    isMine ? "bg-white/20 text-white" : "bg-primary text-primary-foreground"
                                )}
                            >
                                <Volume2 className="size-4" />
                            </div>
                            <audio
                                src={message.mediaUrl!}
                                controls
                                className="h-8 max-w-[180px] outline-none"
                            />
                        </div>
                    )}

                    {/* Footer Time & Status Receipts */}
                    <div
                        className={cn(
                            "flex items-center justify-end gap-1 mt-1 text-[10.5px] font-medium leading-none select-none",
                            isMine ? "text-white/80" : "text-muted-foreground"
                        )}
                    >
                        <span>{timeString}</span>

                        {isMine && (
                            <span className="flex items-center ml-0.5">
                                {message.status === "sending" && (
                                    <Clock className="size-3 opacity-70 animate-pulse" />
                                )}
                                {message.status === "sent" && (
                                    <Check className="size-3.5 opacity-90 stroke-[2.5]" />
                                )}
                                {message.status === "delivered" && (
                                    <CheckCheck className="size-3.5 opacity-90 stroke-[2.5]" />
                                )}
                                {message.status === "seen" && (
                                    <CheckCheck className="size-3.5 text-cyan-200 dark:text-cyan-300 stroke-[2.5]" />
                                )}
                                {message.status === "failed" && (
                                    <button
                                        type="button"
                                        onClick={() => onRetry?.(message)}
                                        className="text-red-200 hover:text-white transition-colors"
                                        title="Retry sending"
                                    >
                                        <RotateCw className="size-3" />
                                    </button>
                                )}
                            </span>
                        )}
                    </div>
                </div>

                {/* Floating Quick Action Bar on Hover */}
                <AnimatePresence>
                    {showActions && !isEditing && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 2 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 2 }}
                            transition={{ duration: 0.12 }}
                            className={cn(
                                "flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full bg-card/90 dark:bg-card border border-border/80 shadow-xs text-[11px] z-10"
                            )}
                        >
                            {/* Edit Button (only text, for sender) */}
                            {isMine && message.messageType === "text" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditText(message.text || "");
                                        setIsEditing(true);
                                    }}
                                    className="px-2 py-0.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors font-medium flex items-center gap-1"
                                >
                                    <Edit2 className="size-2.5" />
                                    <span>Edit</span>
                                </button>
                            )}

                            {/* Delete for Me */}
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleDeleteForMe}
                                className="px-2 py-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors font-medium flex items-center gap-1"
                            >
                                <Trash2 className="size-2.5" />
                                <span>Delete for me</span>
                            </button>

                            {/* Delete for Everyone */}
                            {isMine && isWithin15Mins && (
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDeleteForEveryone}
                                    className="px-2 py-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors font-medium flex items-center gap-1"
                                >
                                    <Trash2 className="size-2.5 text-destructive" />
                                    <span className="text-destructive font-semibold">For everyone</span>
                                </button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MessageBubble;