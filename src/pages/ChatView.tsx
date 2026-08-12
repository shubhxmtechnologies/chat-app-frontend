import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    Loader2,
    ArrowDown,
    AlertCircle,
    UserX,
    UserCheck,
    Copy,
    Check,
    X,
    Maximize2,
    Info,
    Bell,
    BellOff,
    MessageCircle,
} from "lucide-react";

import { blockUser, unblockUser, toggleChatMute } from "@/api/user.api";
import { getUserChats } from "@/api/chat.api";
import { getMessages } from "@/api/message.api";
import { useAuth } from "@/context/AuthContext";
import { useChatSocket } from "@/hooks/useChatSocket";
import { socket } from "@/socket/socketClient";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { usePresence } from "@/context/PresenceContext";
import { getRelativeTime } from "@/utils/time.util";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import MessageBubble from "@/components/MessageBubble";
import MessageInput from "@/components/MessageInput";

import type { Chat } from "@/types/chat.types";
import type { Message } from "@/types/message.types";

const DEFAULT_AVATAR = "https://cutiedp.com/wp-content/uploads/2025/08/no-dp-image-4.webp";

const ChatView = () => {
    const { chatId } = useParams<{ chatId: string }>();
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { isOnline, getLastSeen } = usePresence();

    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
    const [showNewMessagePill, setShowNewMessagePill] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);

    // Profile Details & Full DP Lightbox Modals
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showFullDp, setShowFullDp] = useState(false);
    const [copiedHandle, setCopiedHandle] = useState(false);

    // Unseen messages divider
    const [unseenDividerId, setUnseenDividerId] = useState<string | null>(null);

    const otherUser = chat?.participants.find((p) => p._id !== user?.id);
    const { handleTyping, stopTyping } = useTypingIndicator(chatId ?? "", otherUser?._id);

    const containerRef = useRef<HTMLDivElement>(null);
    const previousScrollHeightRef = useRef<number>(0);
    const isNearBottomRef = useRef<boolean>(true);
    const isInitialLoadRef = useRef<boolean>(true);
    const lastMessageIdRef = useRef<string | null>(null);

    // Initial data fetch
    const fetchData = async () => {
        if (!chatId) return;
        try {
            isInitialLoadRef.current = true;
            setLoading(true);
            setError("");
            const [messagesData, chatsData] = await Promise.all([
                getMessages(chatId),
                getUserChats(),
            ]);

            const reversedMessages = messagesData.messages.slice().reverse();

            if (isInitialLoadRef.current) {
                const firstUnseen = reversedMessages.find(m => m.status !== "seen" && m.sender !== user?.id);
                if (firstUnseen) {
                    setUnseenDividerId(firstUnseen._id);
                    setTimeout(() => setUnseenDividerId(null), 4000);
                }
            }

            setMessages(reversedMessages);
            setNextCursor(messagesData.nextCursor);
            setChat(chatsData.find((c) => c._id === chatId) || null);
            socket.emit("mark_seen", chatId);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load conversation");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchData();
    }, [chatId]);

    // Socket message handler
    const { sendMessage, sendMedia, retryMessage } = useChatSocket({
        chatId: chatId ?? "",
        currentUserId: user?.id ?? "",
        setMessages,
    });

    const handleDeleteLocal = (messageId: string) => {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    const handleEditLocal = (messageId: string, newText: string) => {
        setMessages((prev) =>
            prev.map((m) =>
                m._id === messageId
                    ? { ...m, text: newText, isEdited: true, editedAt: new Date().toISOString() }
                    : m
            )
        );
    };

    const handleDeleteForEveryoneLocal = (messageId: string) => {
        setMessages((prev) =>
            prev.map((m) =>
                m._id === messageId
                    ? { ...m, isDeletedForEveryone: true, text: null, mediaUrl: null }
                    : m
            )
        );
    };

    // Block/Unblock toggle handler
    const handleBlockToggle = async () => {
        if (!chat || !otherUser || isBlocking) return;
        try {
            setIsBlocking(true);
            if (chat.blockedByMe) {
                await unblockUser(otherUser._id);
                setChat({ ...chat, blockedByMe: false });
            } else {
                await blockUser(otherUser._id);
                setChat({ ...chat, blockedByMe: true });
            }
        } catch (err) {
            console.error("Failed to toggle block status:", err);
        } finally {
            setIsBlocking(false);
        }
    };

    // Mute/Unmute Chat
    const [isMuting, setIsMuting] = useState(false);
    const isMuted = user?.mutedChats?.includes(chatId || "");

    const handleMuteToggle = async () => {
        if (!chatId) return;
        try {
            setIsMuting(true);
            const newMutedChats = await toggleChatMute(chatId);
            updateUser({ mutedChats: newMutedChats });
        } catch (err) {
            console.error("Failed to toggle mute status:", err);
        } finally {
            setIsMuting(false);
        }
    };

    // Copy user handle
    const handleCopyOtherUserHandle = async () => {
        if (!otherUser?.username) return;
        try {
            await navigator.clipboard.writeText(`@${otherUser.username}`);
            setCopiedHandle(true);
            setTimeout(() => setCopiedHandle(false), 2000);
        } catch (err) {
            console.error("Failed to copy handle:", err);
        }
    };

    // Realtime typing signals
    useEffect(() => {
        if (!chatId) return;

        const handleUserTyping = ({
            chatId: eventChatId,
            userId: typingUserId,
        }: {
            chatId: string;
            userId: string;
        }) => {
            if (eventChatId === chatId && typingUserId !== user?.id) {
                setIsTyping(true);
                if (isNearBottomRef.current) {
                    setTimeout(() => scrollToBottom(), 100);
                }
            }
        };

        const handleUserStopTyping = ({
            chatId: eventChatId,
            userId: typingUserId,
        }: {
            chatId: string;
            userId: string;
        }) => {
            if (eventChatId === chatId && typingUserId !== user?.id) {
                setIsTyping(false);
            }
        };

        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);

        return () => {
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
            setIsTyping(false);
        };
    }, [chatId, user?.id]);

    // Scroll management
    const scrollToBottom = () => {
        try {
            if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
                isNearBottomRef.current = true;
                setShowNewMessagePill(false);
            }
        } catch (err) {
            console.error("Failed to scroll to bottom:", err);
        }
    };

    const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
        try {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;

            if (isNearBottomRef.current) {
                setShowNewMessagePill(false);
            }
        } catch (err) {
            console.error("Scroll position computation error:", err);
        }

        // Pagination for older messages
        if (!chatId || !nextCursor || loadingOlder) return;

        if (e.currentTarget.scrollTop < 80) {
            try {
                setLoadingOlder(true);
                const data = await getMessages(chatId, nextCursor);

                if (containerRef.current) {
                    previousScrollHeightRef.current = containerRef.current.scrollHeight;
                }

                setMessages((prev) => [...data.messages.slice().reverse(), ...prev]);
                setNextCursor(data.nextCursor);
            } catch (err) {
                console.error("Failed to load older messages:", err);
            } finally {
                setLoadingOlder(false);
            }
        }
    };

    useLayoutEffect(() => {
        try {
            if (previousScrollHeightRef.current > 0 && containerRef.current) {
                const diff =
                    containerRef.current.scrollHeight - previousScrollHeightRef.current;
                containerRef.current.scrollTop += diff;
                previousScrollHeightRef.current = 0;
            }
        } catch (err) {
            console.error("Scroll position preservation error:", err);
        }
    }, [messages.length]);

    useLayoutEffect(() => {
        try {
            if (messages.length === 0) return;

            const currentLastMessageId = messages[messages.length - 1]?._id;

            if (isInitialLoadRef.current) {
                scrollToBottom();
                isInitialLoadRef.current = false;
                lastMessageIdRef.current = currentLastMessageId;
                return;
            }

            if (currentLastMessageId !== lastMessageIdRef.current) {
                lastMessageIdRef.current = currentLastMessageId;

                if (isNearBottomRef.current) {
                    scrollToBottom();
                } else {
                    setShowNewMessagePill(true);
                }
            }
        } catch (err) {
            console.error("Auto-scroll failed:", err);
        }
    }, [messages]);

    if (!chatId) return null;

    const online = otherUser ? isOnline(otherUser._id) : false;
    const lastSeenTime = otherUser
        ? getLastSeen(otherUser._id, otherUser.lastSeenAt)
        : null;
    const isBlocked = chat?.blockedByMe || chat?.blockedByThem;
    const otherUserAvatar = otherUser?.avatarUrl || DEFAULT_AVATAR;

    const displayName =
        otherUser?.name?.firstName
            ? `${otherUser.name.firstName} ${otherUser.name.lastName || ""}`.trim()
            : otherUser?.username
                ? `@${otherUser.username}`
                : "User";

    return (
        <div className="h-screen w-full flex flex-col bg-background bg-ambient-glow text-foreground overflow-hidden">
            {/* =========================================================================
                HEADER BAR
               ========================================================================= */}
            <header className="w-full border-b border-border/80 bg-card/70 backdrop-blur-md px-4 h-16 shrink-0 flex items-center justify-between z-20">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Back Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/")}
                        className="size-9 text-muted-foreground hover:text-foreground shrink-0"
                        aria-label="Back to conversations"
                    >
                        <ArrowLeft className="size-4" />
                    </Button>

                    {/* Participant Avatar & Presence (Clickable to open profile details) */}
                    {otherUser && (
                        <div
                            onClick={() => setShowProfileModal(true)}
                            className="relative shrink-0 cursor-pointer group"
                            title="Click to view profile & DP"
                        >
                            <img
                                src={otherUserAvatar}
                                alt={otherUser.username}
                                className="size-10 rounded-full object-cover border border-border group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                            />
                            {online && (
                                <span
                                    className="absolute bottom-0 right-0 size-3 rounded-full bg-emerald-500 ring-2 ring-card"
                                    title="Online"
                                />
                            )}
                        </div>
                    )}

                    {/* Participant Info (Clickable to open profile modal) */}
                    {otherUser ? (
                        <div
                            onClick={() => setShowProfileModal(true)}
                            className="min-w-0 cursor-pointer group"
                            title="Click to view profile"
                        >
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-[15px] font-bold leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                                    {displayName}
                                </h2>
                                {otherUser.name?.firstName && (
                                    <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                                        @{otherUser.username}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] leading-tight mt-0.5 truncate h-4">
                                {isTyping ? (
                                    <span className="text-primary font-medium animate-pulse">
                                        Typing...
                                    </span>
                                ) : online ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        Online
                                    </span>
                                ) : lastSeenTime ? (
                                    <span className="text-muted-foreground">Last seen {getRelativeTime(lastSeenTime)}</span>
                                ) : (
                                    <span className="text-muted-foreground">Offline</span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    )}
                </div>

                {/* Header Actions */}
                {otherUser && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* Info Action */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowProfileModal(true)}
                            className="size-8 text-muted-foreground hover:text-foreground"
                            aria-label="View user profile"
                        >
                            <Info className="size-4" />
                        </Button>

                        {/* Mute Action */}
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isMuting}
                            onClick={handleMuteToggle}
                            className={cn(
                                "size-8 text-muted-foreground hover:text-foreground",
                                isMuted && "text-amber-500 hover:text-amber-600"
                            )}
                            aria-label="Mute chat"
                        >
                            {isMuting ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : isMuted ? (
                                <BellOff className="size-4" />
                            ) : (
                                <Bell className="size-4" />
                            )}
                        </Button>

                        {/* Block/Unblock Action */}
                        <Button
                            variant={chat?.blockedByMe ? "secondary" : "ghost"}
                            size="sm"
                            disabled={isBlocking}
                            onClick={handleBlockToggle}
                            className={cn(
                                "h-8 px-2.5 text-xs font-medium gap-1.5",
                                chat?.blockedByMe
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-destructive"
                            )}
                        >
                            {isBlocking ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : chat?.blockedByMe ? (
                                <>
                                    <UserCheck className="size-3.5" />
                                    <span>Unblock</span>
                                </>
                            ) : (
                                <>
                                    <UserX className="size-3.5" />
                                    <span className="hidden sm:inline">Block</span>
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </header>

            {/* =========================================================================
                PARTICIPANT PROFILE DETAILS MODAL
               ========================================================================= */}
            <AnimatePresence>
                {showProfileModal && otherUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowProfileModal(false)}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative"
                        >
                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-4 right-4 size-8 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                            >
                                <X className="size-4" />
                            </button>

                            {/* Full DP Showcase with zoom trigger */}
                            <div className="flex flex-col items-center text-center space-y-3 p-6">
                                <div
                                    onClick={() => setShowFullDp(true)}
                                    className="relative group size-28 rounded-full overflow-hidden border-2 border-border shadow-md cursor-pointer ring-4 ring-primary/10"
                                    title="Click to view full picture"
                                >
                                    <img
                                        src={otherUserAvatar}
                                        alt={otherUser.username}
                                        className="size-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Maximize2 className="size-5" />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-foreground">
                                        {displayName}
                                    </h3>

                                    {/* Copyable @username handle */}
                                    <div className="mt-1 flex items-center justify-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleCopyOtherUserHandle}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/80 hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
                                            title="Click to copy handle"
                                        >
                                            <span>@{otherUser.username}</span>
                                            {copiedHandle ? (
                                                <Check className="size-3 text-emerald-500 stroke-3" />
                                            ) : (
                                                <Copy className="size-3 opacity-60" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Online Presence Badge */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-muted-foreground">
                                    <span
                                        className={cn(
                                            "size-2 rounded-full",
                                            online ? "bg-emerald-500" : "bg-muted-foreground/40"
                                        )}
                                    />
                                    <span>
                                        {online ? "Online" : lastSeenTime ? `Last seen ${getRelativeTime(lastSeenTime)}` : "Offline"}
                                    </span>
                                </div>
                            </div>

                            {/* Bio details */}
                            <div className="px-6 pb-6">
                            <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 text-xs text-muted-foreground leading-relaxed">
                                <span className="font-semibold text-foreground block mb-0.5">Bio:</span>
                                {otherUser.bio || "No bio provided."}
                            </div>

                            {/* Actions in Profile Modal */}
                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    className="flex-1 rounded-xl text-xs font-semibold"
                                    onClick={() => {
                                        setShowProfileModal(false);
                                        setShowFullDp(true);
                                    }}
                                >
                                    <Maximize2 className="size-3.5 mr-1.5" />
                                    <span>View Photo</span>
                                </Button>

                                <Button
                                    variant={chat?.blockedByMe ? "secondary" : "destructive"}
                                    className="flex-1 rounded-xl text-xs font-semibold"
                                    disabled={isBlocking}
                                    onClick={handleBlockToggle}
                                >
                                    {chat?.blockedByMe ? (
                                        <>
                                            <UserCheck className="size-3.5 mr-1.5" />
                                            <span>Unblock</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserX className="size-3.5 mr-1.5" />
                                            <span>Block Contact</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* =========================================================================
                FULLSCREEN DP LIGHTBOX MODAL
               ========================================================================= */}
            <AnimatePresence>
                {showFullDp && otherUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowFullDp(false)}
                        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-lg flex items-center justify-center p-4 cursor-zoom-out"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-sm w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                        >
                            <img
                                src={otherUserAvatar}
                                alt={otherUser.username}
                                className="w-full h-auto object-cover max-h-[75vh]"
                            />
                            <button
                                type="button"
                                onClick={() => setShowFullDp(false)}
                                className="absolute top-3 right-3 size-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* =========================================================================
                MAIN CHAT CONTAINER
               ========================================================================= */}
            <main className="flex-1 flex flex-col min-h-0 relative w-full">
                {/* Error Banner */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="m-3 flex items-center justify-between gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
                        role="alert"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => void fetchData()}
                        >
                            Retry
                        </Button>
                    </motion.div>
                )}

                {/* Message Scroll Container */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                >
                    {/* Older Messages Loading Indicator */}
                    {loadingOlder && (
                        <div className="flex justify-center py-2">
                            <Skeleton className="h-6 w-36 rounded-full" />
                        </div>
                    )}

                    {/* Initial Loading Skeletons */}
                    {loading ? (
                        <div className="space-y-4 py-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex",
                                        i % 2 === 0 ? "justify-start" : "justify-end"
                                    )}
                                >
                                    <Skeleton
                                        className={cn(
                                            "h-10 rounded-2xl",
                                            i % 2 === 0 ? "w-48" : "w-64"
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : messages.length === 0 ? (
                        /* Empty Chat State */
                        <div className="flex flex-col items-center justify-center h-full min-h-75 text-center px-4 py-10 opacity-70">
                            <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                <MessageCircle className="size-8" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-1">
                                No messages yet
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-60">
                                Send a message to start the conversation!
                            </p>
                        </div>
                    ) : (
                        /* Message List */
                        messages.map((message) => (
                            <React.Fragment key={message._id || message.clientMessageId}>
                                {unseenDividerId === (message.clientMessageId || message._id) && (
                                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center my-4 w-full relative z-10">
                                        <div className="bg-primary/10 text-primary text-[12px] font-semibold px-4 py-1.5 rounded-full border border-primary/20 shadow-sm backdrop-blur-md">
                                            Unread Messages
                                        </div>
                                    </motion.div>
                                )}
                                <MessageBubble
                                    message={message}
                                    isMine={message.sender === user?.id}
                                    onDeleteLocal={handleDeleteLocal}
                                    onEditLocal={handleEditLocal}
                                    onDeleteForEveryoneLocal={handleDeleteForEveryoneLocal}
                                    onRetry={retryMessage}
                                    onReply={(msg) => setReplyingToMessage(msg)}
                                />
                            </React.Fragment>
                        ))
                    )}


                </div>

                {/* Floating "New Message" Scroll Pill */}
                <AnimatePresence>
                    {showNewMessagePill && (
                        <motion.button
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            type="button"
                            onClick={scrollToBottom}
                            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md hover:opacity-90 active:scale-95 transition-all z-10"
                        >
                            <ArrowDown className="size-3.5" />
                            <span>New messages</span>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Typing Indicator Bar (in layout flow above input so it never overlaps messages) */}
                <AnimatePresence>
                    {isTyping && !isBlocked && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: 4 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: 4 }}
                            transition={{ duration: 0.2 }}
                            className="px-3 lg:px-4 shrink-0 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 py-1">
                                <div className="bg-card dark:bg-card/90 text-foreground border border-border/80 px-3 py-1.5 rounded-2xl rounded-bl-sm shadow-xs flex items-center gap-1.5 w-fit">
                                    <span className="size-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                    <span className="size-1.5 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="size-1.5 bg-primary/70 rounded-full animate-bounce" />
                                </div>
                                
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Message Input Bar */}
                <footer className="p-3 lg:p-4 bg-transparent shrink-0">
                    <MessageInput
                        replyingTo={
                            replyingToMessage
                                ? {
                                    _id: replyingToMessage._id,
                                    text: replyingToMessage.text,
                                    messageType: replyingToMessage.messageType,
                                }
                                : null
                        }
                        onCancelReply={() => setReplyingToMessage(null)}
                        onSend={(text, clientMessageId) => {
                            sendMessage(text, clientMessageId, replyingToMessage);
                            setReplyingToMessage(null);
                        }}
                        onSendMedia={(file, previewUrl, clientMessageId, messageType) => {
                            sendMedia(file, previewUrl, clientMessageId, messageType, replyingToMessage);
                            setReplyingToMessage(null);
                        }}
                        onTyping={() => {
                            if (!isBlocked) {
                                handleTyping();
                            }
                        }}
                        onStopTyping={stopTyping}
                        blockedByMe={chat?.blockedByMe}
                        blockedByThem={chat?.blockedByThem}
                        onUnblock={handleBlockToggle}
                        disabled={loading}
                    />
                </footer>
            </main>
        </div>
    );
};

export default ChatView;