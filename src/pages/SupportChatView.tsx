import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Bug,
    MessageSquareWarning,
    Copy,
    Reply,
    Info,
    MoreVertical,
    X,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MessageInput from "@/components/MessageInput";
import {
    getSupportTicket,
    sendSupportMessage,
    markSupportRead
} from "@/api/support.api";
import type { SupportTicket, SupportMessage } from "@/api/support.api";
import { getRelativeTime } from "@/utils/time.util";
import { renderTextWithLinks } from "@/utils/text.util";
import { socket } from "@/socket/socketClient";
import { playReceiveSound, playSendSound } from "@/utils/sound.util";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface SupportBubbleProps {
    msg: SupportMessage;
    isMe: boolean;
    onReply: (msg: SupportMessage) => void;
}

function SupportMessageBubble({ msg, isMe, onReply }: SupportBubbleProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [copied, setCopied] = useState(false);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleTouchStart = useCallback(() => {
        if (isMenuOpen) return;
        longPressTimerRef.current = setTimeout(() => {
            setIsMenuOpen(true);
        }, 500);
    }, [isMenuOpen]);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
    }, []);

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

    const handleCopy = async () => {
        if (!msg.text) return;
        try {
            await navigator.clipboard.writeText(msg.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            setIsMenuOpen(false);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    // Check if message text starts with a quoted reply prefix
    const hasQuotedReply = msg.text && msg.text.startsWith("[Reply: ");
    let replySnippet: string | null = null;
    let actualBody = msg.text || "";

    if (hasQuotedReply && msg.text) {
        const endQuoteIdx = msg.text.indexOf("]\n\n");
        if (endQuoteIdx !== -1) {
            replySnippet = msg.text.substring(8, endQuoteIdx);
            actualBody = msg.text.substring(endQuoteIdx + 3);
        }
    }

    return (
        <div className={cn("group relative flex w-full my-1 transition-all", isMe ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "flex max-w-[85%] sm:max-w-[75%] items-center gap-1.5 cursor-pointer md:cursor-auto min-w-0",
                    isMe ? "flex-row-reverse" : "flex-row"
                )}
            >
                <div className={cn("flex flex-col relative max-w-full min-w-0", isMe ? "items-end" : "items-start")}>
                    {/* Main Bubble Container */}
                    <div
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        onContextMenu={(e) => {
                            if (window.matchMedia("(max-width: 768px)").matches) {
                                e.preventDefault();
                            }
                        }}
                        className={cn(
                            "relative px-3.5 py-2.5 text-[14px] leading-relaxed transition-all duration-200 shadow-xs select-none md:select-text max-w-full min-w-0 overflow-hidden",
                            isMe
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-xs font-normal"
                                : "bg-muted text-foreground border border-border/40 rounded-2xl rounded-bl-xs"
                        )}
                    >
                        {/* Reply Snippet if present */}
                        {replySnippet && (
                            <div
                                className={cn(
                                    "mb-2 p-2 rounded-xl text-[12px] opacity-90 border-l-2 max-w-full min-w-0 overflow-hidden",
                                    isMe ? "bg-primary-foreground/10 border-primary-foreground/40 text-primary-foreground" : "bg-card/60 border-primary text-foreground"
                                )}
                            >
                                <span className="block max-w-full truncate italic">
                                    {replySnippet}
                                </span>
                            </div>
                        )}

                        {/* Message Body */}
                        <div className="break-words [word-break:normal] [overflow-wrap:anywhere] whitespace-pre-wrap max-w-full min-w-0">
                            {renderTextWithLinks(actualBody)}
                        </div>

                        {/* Timestamp */}
                        <div
                            className={cn(
                                "text-[10px] mt-1 text-right font-medium",
                                isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                            )}
                        >
                            {getRelativeTime(msg.createdAt)}
                        </div>
                    </div>

                    {/* Floating Dropdown Menu for Actions (Copy, Reply, Message Info only) */}
                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
                                    onClick={() => setIsMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="z-50 w-52 md:w-48 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-xl p-1.5 space-y-1 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* 1. Reply Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onReply(msg);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Reply className="size-3.5 text-muted-foreground" />
                                        <span>Reply</span>
                                    </button>

                                    {/* 2. Copy Text Option */}
                                    {msg.text && (
                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                        >
                                            {copied ? (
                                                <Check className="size-3.5 text-emerald-500" />
                                            ) : (
                                                <Copy className="size-3.5 text-muted-foreground" />
                                            )}
                                            <span>{copied ? "Copied!" : "Copy text"}</span>
                                        </button>
                                    )}

                                    {/* 3. Message Info Option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowInfo(true);
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Info className="size-3.5 text-muted-foreground" />
                                        <span>Message info</span>
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3-Dots icon trigger (Desktop hover only) */}
                <div
                    className={cn(
                        "hidden md:flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        isMenuOpen && "opacity-100"
                    )}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen((prev) => !prev);
                        }}
                        className="size-7 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Message options"
                    >
                        <MoreVertical className="size-4" />
                    </button>
                </div>
            </div>

            {/* Message Info Modal */}
            <AnimatePresence>
                {showInfo && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
                        onClick={() => setShowInfo(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-xs bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-6 shadow-2xl relative"
                        >
                            <button
                                type="button"
                                onClick={() => setShowInfo(false)}
                                className="absolute top-3.5 right-3.5 p-1.5 rounded-xl bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                            <h3 className="font-semibold text-base tracking-tight mb-4 text-foreground">Message Info</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                        Sender
                                    </p>
                                    <p className="text-sm font-medium mt-1 text-foreground">
                                        {isMe ? "You" : "Developer"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
                                        Sent
                                    </p>
                                    <p className="text-sm font-medium mt-1 text-foreground">
                                        {new Date(msg.createdAt).toLocaleString(undefined, {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                        })}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SupportChatView() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user]);
    
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ _id: string; text: string | null; messageType: string } | null>(null);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTicket = async () => {
            try {
                const data = await getSupportTicket();
                setTicket(data);
                if (data.unreadCount > 0) {
                    await markSupportRead();
                }
            } catch (error) {
                console.error("Failed to fetch support ticket", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTicket();
    }, []);

    useEffect(() => {
        const handleNewMessage = (msg: SupportMessage) => {
            if (msg.sender === "developer") {
                try {
                    if (!userRef.current?.globalMute) {
                        playReceiveSound();
                    }
                } catch (e) {
                    console.warn("Failed to play support receive sound:", e);
                }
            }

            setTicket((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: [...prev.messages, msg],
                    canSend: msg.sender === "developer" ? true : prev.canSend,
                };
            });
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
                markSupportRead();
            }, 100);
        };
        const handleTicketUpdate = (updatedTicket: SupportTicket) => {
            setTicket(updatedTicket);
        };
        
        socket.on("support_message", handleNewMessage);
        socket.on("support_ticket_updated", handleTicketUpdate);
        
        return () => {
            socket.off("support_message", handleNewMessage);
            socket.off("support_ticket_updated", handleTicketUpdate);
        };
    }, []);

    useEffect(() => {
        if (!loading) {
            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [loading, ticket?.messages.length]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        if (!ticket?.canSend || ticket?.isBlocked) return;
        
        playSendSound();
        try {
            setSending(true);
            const finalText = replyingTo
                ? `[Reply: ${replyingTo.text && replyingTo.text.length > 50 ? `${replyingTo.text.slice(0, 50)}...` : replyingTo.text}]\n\n${text.trim()}`
                : text.trim();

            setReplyingTo(null);
            const updatedTicket = await sendSupportMessage(finalText);
            setTicket(updatedTicket);
            setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        } catch (error) {
            console.error("Failed to send support message", error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full bg-background relative max-w-full overflow-hidden">
                <header className="h-18 shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                            <Skeleton className={`h-16 w-48 rounded-2xl ${i % 2 === 0 ? "rounded-tr-sm" : "rounded-tl-sm"}`} />
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/40">
                    <Skeleton className="h-12 w-full rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background relative max-w-full overflow-hidden">
            {/* Header */}
            <header className="h-16 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 hover:bg-muted rounded-xl size-9"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="size-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
                            <Bug className="size-5" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="font-semibold text-sm tracking-tight text-foreground flex items-center gap-2">
                                Developer Contact
                            </h2>
                            <span className="text-[12px] text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="flex justify-center mb-6">
                    <div className="bg-muted/70 text-muted-foreground text-xs font-medium px-4 py-1.5 rounded-full shadow-2xs border border-border/50 text-center max-w-sm flex items-center gap-2">
                        <MessageSquareWarning className="size-3.5 text-muted-foreground" />
                        Report bugs or request new features directly to the developer.
                    </div>
                </div>
                
                {ticket?.messages.map((msg, idx) => {
                    const isMe = msg.sender === "user";
                    return (
                        <SupportMessageBubble
                            key={msg._id || idx}
                            msg={msg}
                            isMe={isMe}
                            onReply={(targetMsg) => {
                                setReplyingTo({
                                    _id: targetMsg._id,
                                    text: targetMsg.text,
                                    messageType: "text",
                                });
                            }}
                        />
                    );
                })}
                <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/40">
                {ticket?.isBlocked ? (
                    <div className="text-center text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                        You have been blocked from sending support requests.
                    </div>
                ) : !ticket?.canSend ? (
                    <div className="text-center text-sm text-muted-foreground font-medium p-3 bg-secondary/50 rounded-xl border border-border/50">
                        Message sent. You can send another message once the developer replies.
                    </div>
                ) : (
                    <MessageInput
                        replyingTo={replyingTo}
                        onCancelReply={() => setReplyingTo(null)}
                        onSend={(text) => handleSend(text)}
                        onFocus={() => {
                            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => {
                                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
                            }, 300);
                        }}
                        onTyping={() => {}}
                        onStopTyping={() => {}}
                        disabled={sending}
                        disableVoice={true}
                        disableMedia={true}
                    />
                )}
            </div>
        </div>
    );
}
