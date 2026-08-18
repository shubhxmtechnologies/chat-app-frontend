import { useState, useRef, useEffect, useCallback } from "react";
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
    MoreVertical,
    Reply,
    Copy,
    Info,
    Download,
    Maximize2,
} from "lucide-react";
import type { Message } from "@/types/message.types";
import { editMessage, deleteMessageForMe, deleteMessageForEveryone } from "@/api/message.api";
import { cn } from "@/lib/utils";
import { renderTextWithLinks } from "@/utils/text.util";
import VoicePlayer from "./VoicePlayer";

interface Props {
    message: Message;
    isMine: boolean;
    onDeleteLocal: (messageId: string) => void;
    onRetry?: (message: Message) => void;
    onReply?: (message: Message) => void;
    onEditLocal?: (messageId: string, newText: string) => void;
    onDeleteForEveryoneLocal?: (messageId: string) => void;
}

const MessageBubble = ({
    message,
    isMine,
    onDeleteLocal,
    onRetry,
    onReply,
    onEditLocal,
    onDeleteForEveryoneLocal,
}: Props) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleDownloadImage = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!message.mediaUrl) return;
        try {
            setIsDownloading(true);
            const response = await fetch(message.mediaUrl);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `pinsta-image-${message._id.slice(-6)}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch {
            const link = document.createElement("a");
            link.href = message.mediaUrl;
            link.target = "_blank";
            link.download = `pinsta-image-${message._id.slice(-6)}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            setIsDownloading(false);
        }
    };

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
            onDeleteForEveryoneLocal?.(message._id);
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
            onEditLocal?.(message._id, trimmed);
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

    const handleCopy = () => {
        if (message.text) {
            navigator.clipboard.writeText(message.text);
        }
        setIsMenuOpen(false);
    };

    const handleTouchStart = useCallback(() => {
        if (isMenuOpen || isEditing) return;
        longPressTimerRef.current = setTimeout(() => {
            setIsMenuOpen(true);
        }, 500); // 500ms long press
    }, [isMenuOpen, isEditing]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        if (!isMenuOpen) return;
        
        const closeMenu = () => setIsMenuOpen(false);
        window.addEventListener("click", closeMenu);
        window.addEventListener("touchstart", closeMenu);
        
        return () => {
            window.removeEventListener("click", closeMenu);
            window.removeEventListener("touchstart", closeMenu);
        };
    }, [isMenuOpen]);

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
            id={`msg-${message._id}`}
            className={cn(
                "group relative flex w-full my-1 transition-all",
                isMine ? "justify-end" : "justify-start"
            )}
        >
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={(_, info) => {
                    const threshold = 60;
                    if (isMine && info.offset.x < -threshold) {
                        onReply?.(message);
                    } else if (!isMine && info.offset.x > threshold) {
                        onReply?.(message);
                    }
                }}
                className={cn(
                    "flex max-w-[85%] sm:max-w-[75%] items-center gap-2 cursor-pointer md:cursor-auto min-w-0",
                    isMine ? "flex-row-reverse" : "flex-row"
                )}
            >
                <div
                    className={cn(
                        "flex flex-col relative max-w-full min-w-0",
                        isMine ? "items-end" : "items-start"
                    )}
                >
                    {/* Main Bubble Container */}
                    <div
                        id={`bubble-${message._id}`}
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        onContextMenu={(e) => {
                            // Prevent default context menu to allow our long press on mobile
                            if (window.matchMedia("(max-width: 768px)").matches) {
                                e.preventDefault();
                            }
                        }}
                        className={cn(
                            "relative px-4 py-2.5 text-[14.5px] leading-[1.45] transition-all duration-300 shadow-sm select-none md:select-text max-w-full min-w-0 overflow-hidden",
                            isMine
                                ? "bg-gradient-chat-sender text-white rounded-[22px] rounded-br-lg shadow-indigo-500/10 font-normal"
                                : "bg-card dark:bg-card/90 text-foreground border border-border/80 rounded-[22px] rounded-bl-lg shadow-xs"
                        )}
                    >
                        {/* Reply Snippet */}
                        {message.replyTo && (
                            <div
                                onClick={() => {
                                    const msgEl = document.getElementById(`msg-${message.replyTo?._id}`);
                                    const bubbleEl = document.getElementById(`bubble-${message.replyTo?._id}`);
                                    if (msgEl && bubbleEl) {
                                        msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        // Different highlight effect: brightness and scale
                                        bubbleEl.classList.add('brightness-125', 'scale-[1.02]', 'ring-2', 'ring-primary/50', 'ring-offset-2', 'ring-offset-background');
                                        setTimeout(() => {
                                            bubbleEl.classList.remove('brightness-125', 'scale-[1.02]', 'ring-2', 'ring-primary/50', 'ring-offset-2', 'ring-offset-background');
                                        }, 1500);
                                    }
                                }}
                                className={cn(
                                    "mb-2 p-2 rounded-lg text-[12px] opacity-80 border-l-2 cursor-pointer hover:opacity-100 transition-opacity max-w-full min-w-0 overflow-hidden",
                                    isMine ? "bg-white/10 border-white/40 text-white" : "bg-black/5 dark:bg-white/5 border-primary text-foreground"
                                )}
                            >
                                <span className="block max-w-full truncate break-all italic">
                                    {message.replyTo.messageType === "text"
                                        ? (message.replyTo.text && message.replyTo.text.length > 70
                                            ? `${message.replyTo.text.slice(0, 70)}…`
                                            : message.replyTo.text)
                                        : `[${message.replyTo.messageType === "voice" ? "Voice message" : message.replyTo.messageType === "image" ? "Photo" : message.replyTo.messageType}]`}
                                </span>
                            </div>
                        )}

                        {/* Content Rendering based on Type */}
                        {message.messageType === "text" && (
                            <div className="max-w-full min-w-0 overflow-hidden">
                                {isEditing ? (
                                    <div className="flex items-center gap-1.5 my-0.5">
                                        <input
                                            ref={inputRef}
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isSaving}
                                            className="bg-white/20 text-white rounded-lg px-2.5 py-1 text-sm outline-none border border-white/40 focus:ring-2 focus:ring-white/50 min-w-45"
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
                                    <div className="wrap-break-words break-all whitespace-pre-wrap max-w-full min-w-0">
                                        {renderTextWithLinks(message.text!)}
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

                        {/* Image Attachments with Square Preview */}
                        {message.messageType === "image" && (
                            <div
                                className="relative rounded-2xl overflow-hidden my-1 size-44 sm:size-56 aspect-square group/img cursor-pointer bg-black/10 dark:bg-white/5"
                                onClick={() => setShowImageModal(true)}
                            >
                                <img
                                    src={message.mediaUrl!}
                                    alt="Chat media"
                                    loading="lazy"
                                    className="size-full object-cover rounded-2xl shadow-xs transition-transform duration-300 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover/img:opacity-100">
                                    <div className="size-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-md">
                                        <Maximize2 className="size-4" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Voice Note Audio Player */}
                        {message.messageType === "voice" && (
                            <div
                                className={cn(
                                    "flex items-center p-2 rounded-2xl min-w-50",
                                    isMine ? "bg-white/10 shadow-inner" : "bg-secondary/70 border border-border/50"
                                )}
                            >
                                <VoicePlayer src={message.mediaUrl!} isMine={isMine} />
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
                                <span className="flex items-center gap-0.5 ml-1">
                                    {message.status === "sending" && (
                                        <>
                                            <span className="opacity-70 font-medium">Sending</span>
                                            <Clock className="size-3 opacity-70 animate-pulse" />
                                        </>
                                    )}
                                    {(message.status === "sent" || message.status === "delivered" as any) && (
                                        <>
                                            <span className="opacity-90 font-medium">Sent</span>
                                            <Check className="size-3.5 opacity-90 stroke-[2.5]" />
                                        </>
                                    )}
                                    {message.status === "seen" && (
                                        <>
                                            <span className="text-cyan-200 dark:text-cyan-300 font-medium">Seen</span>
                                            <CheckCheck className="size-3.5 text-cyan-200 dark:text-cyan-300 stroke-[2.5]" />
                                        </>
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

                    {/* Floating Dropdown Menu for Actions */}
                    <AnimatePresence>
                        {isMenuOpen && !isEditing && (
                            <>
                                {/* Universal Backdrop */}
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                                    onClick={() => setIsMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className={cn(
                                        "z-50 w-52 md:w-48 rounded-xl border border-border bg-card shadow-lg p-1 space-y-0.5",
                                        "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" // Centered everywhere
                                    )}
                                    onClick={(e) => e.stopPropagation()} // Keep menu open if clicking inside it
                                >
                                {/* Reply Option (All) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        onReply?.(message);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                >
                                    <Reply className="size-3.5 text-muted-foreground" />
                                    <span>Reply</span>
                                </button>

                                {/* Copy Option (only for text) */}
                                {message.messageType === "text" && (
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <Copy className="size-3.5 text-muted-foreground" />
                                        <span>Copy text</span>
                                    </button>
                                )}

                                {/* Message Info Option (All) */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInfo(true);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                >
                                    <Info className="size-3.5 text-muted-foreground" />
                                    <span>Message info</span>
                                </button>

                                {/* Edit Button (only text, for sender) */}
                                {isMine && message.messageType === "text" && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditText(message.text || "");
                                            setIsEditing(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors"
                                    >
                                        <Edit2 className="size-3.5 text-muted-foreground" />
                                        <span>Edit message</span>
                                    </button>
                                )}

                                {/* Delete for Me (All) */}
                                <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={handleDeleteForMe}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                                >
                                    <Trash2 className="size-3.5 text-muted-foreground" />
                                    <span>Delete for me</span>
                                </button>

                                {/* Delete for Everyone (only sender) */}
                                {isMine && isWithin15Mins && (
                                    <button
                                        type="button"
                                        disabled={isDeleting}
                                        onClick={handleDeleteForEveryone}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="size-3.5" />
                                        <span>Delete for everyone</span>
                                    </button>
                                )}
                            </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3-Dots icon trigger (Desktop hover only) */}
                <div
                    className={cn(
                        "hidden md:flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isMenuOpen && "opacity-100" // Keep visible if menu is open
                    )}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen((prev) => !prev);
                        }}
                        className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        aria-label="Message options"
                    >
                        <MoreVertical className="size-4" />
                    </button>
                </div>

            </motion.div>

            {/* Message Info Modal */}
            <AnimatePresence>
                {showInfo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowInfo(false)}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xs bg-card border border-border rounded-2xl p-5 shadow-2xl relative"
                        >
                            <button
                                type="button"
                                onClick={() => setShowInfo(false)}
                                className="absolute top-3 right-3 p-1.5 rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>
                            <h3 className="font-bold text-lg mb-4 text-foreground">Message Info</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Sent</p>
                                    <p className="text-sm font-medium mt-1">
                                        {new Date(message.createdAt).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Seen</p>
                                    <p className="text-sm font-medium mt-1">
                                        {message.seenAt ? new Date(message.seenAt).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        }) : "Not seen yet"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Media Zoom Modal with Download Button */}
            <AnimatePresence>
                {showImageModal && (
                    <div
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4"
                        onClick={() => setShowImageModal(false)}
                    >
                        {/* Top Action Bar */}
                        <div
                            className="w-full max-w-3xl flex items-center justify-between px-2 py-3 mb-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span className="text-sm font-medium text-white/80">Photo</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadImage}
                                    disabled={isDownloading}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-medium transition-colors backdrop-blur-xs disabled:opacity-50 cursor-pointer"
                                >
                                    <Download className="size-3.5" />
                                    <span>{isDownloading ? "Downloading..." : "Download"}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowImageModal(false)}
                                    className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
                                    aria-label="Close"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        </div>

                        {/* Centered Image */}
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.92, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-full max-h-[80vh] flex items-center justify-center"
                        >
                            <img
                                src={message.mediaUrl!}
                                alt="Full photo view"
                                className="max-w-[92vw] max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MessageBubble;