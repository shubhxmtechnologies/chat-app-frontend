import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageCircle,
    Search,
    LogOut,
    Plus,
    X,
    Loader2,
    RefreshCw,
    Image as ImageIcon,
    Mic,
    Trash2,
    MoreVertical,
    Sparkles,
    AlertCircle,
    UserX,
    ArrowRight,
    Bell,
    BellOff,
    Maximize2,
    Minimize2,
    Bug,
} from "lucide-react";

import { getSupportTicket } from "@/api/support.api";

import { playReceiveSound } from "@/utils/sound.util";

import { getUserChats, createOrGetChat, deleteChatForMe, deleteChatForEveryone } from "@/api/chat.api";
import { searchUsers, toggleGlobalMute, type SearchUser } from "@/api/user.api";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/context/PresenceContext";
import { socket } from "@/socket/socketClient";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Chat } from "@/types/chat.types";
import type { Message } from "@/types/message.types";

const DEFAULT_AVATAR = "https://cutiedp.com/wp-content/uploads/2025/08/no-dp-image-4.webp";

const ChatList = () => {
    const navigate = useNavigate();
    const { user, logout, updateUser } = useAuth();
    const { isOnline } = usePresence();

    const [chats, setChats] = useState<Chat[]>([]);
    const [typingChats, setTypingChats] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [supportUnreadCount, setSupportUnreadCount] = useState(0);

    // -- Pull-to-Refresh state --
    const [pullRefreshing, setPullRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [rateLimitMsg, setRateLimitMsg] = useState("");
    const pullStartY = useRef(0);
    const isPulling = useRef(false);
    const mainRef = useRef<HTMLDivElement>(null);

    // Rate limiter: max 3 refreshes in 10 seconds
    const pullTimestamps = useRef<number[]>([]);
    const PULL_RATE_LIMIT = 3;
    const PULL_RATE_WINDOW = 10_000; // 10 seconds

    const canPullRefresh = useCallback(() => {
        const now = Date.now();
        // Clean up timestamps older than the window
        pullTimestamps.current = pullTimestamps.current.filter(t => now - t < PULL_RATE_WINDOW);
        return pullTimestamps.current.length < PULL_RATE_LIMIT;
    }, []);

    const PULL_THRESHOLD = 70; // px needed to trigger refresh

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Only start pull if the scrollable container is at the top
        const scrollEl = mainRef.current;
        if (scrollEl && scrollEl.scrollTop <= 0 && !pullRefreshing) {
            pullStartY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    }, [pullRefreshing]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isPulling.current) return;
        const diff = e.touches[0].clientY - pullStartY.current;
        if (diff > 0) {
            // Apply resistance so the pull feels natural
            setPullDistance(Math.min(diff * 0.5, 120));
        } else {
            isPulling.current = false;
            setPullDistance(0);
        }
    }, []);

    const handleTouchEnd = useCallback(async () => {
        if (!isPulling.current) return;
        isPulling.current = false;

        if (pullDistance >= PULL_THRESHOLD) {
            if (!canPullRefresh()) {
                // Rate limited
                setPullDistance(0);
                setRateLimitMsg("Please wait, you're sending too many requests!");
                setTimeout(() => setRateLimitMsg(""), 3000);
                return;
            }

            pullTimestamps.current.push(Date.now());
            setPullRefreshing(true);
            setPullDistance(PULL_THRESHOLD); // Keep indicator visible while loading

            try {
                const data = await getUserChats(true);
                setChats(data);
            } catch (err) {
                console.warn("Pull refresh failed:", err);
            } finally {
                setPullRefreshing(false);
                setPullDistance(0);
            }
        } else {
            setPullDistance(0);
        }
    }, [pullDistance, canPullRefresh]);

    // Search and User Discovery
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [openingChatUserId, setOpeningChatUserId] = useState<string | null>(null);

    // Delete chat context menu
    const [menuChatId, setMenuChatId] = useState<string | null>(null);
    const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

    // Long press support for mobile
    const chatLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [wasLongPress, setWasLongPress] = useState(false);

    const handleChatTouchStart = useCallback((chatId: string) => {
        if (menuChatId === chatId) return;
        setWasLongPress(false);
        chatLongPressTimer.current = setTimeout(() => {
            setMenuChatId(chatId);
            setWasLongPress(true);
        }, 500);
    }, [menuChatId]);

    const handleChatTouchEnd = useCallback(() => {
        if (chatLongPressTimer.current) {
            clearTimeout(chatLongPressTimer.current);
        }
    }, []);

    const debouncedSearch = useDebounce(searchQuery, 300);
    const searchAbortRef = useRef<AbortController | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // Fetch conversations
    const fetchChats = async (isManualRefresh = false, forceRefetch = false) => {
        try {
            if (!isManualRefresh && !forceRefetch) {
                setLoading(true);
            }
            setError("");
            const [data, supportTicket] = await Promise.all([
                getUserChats(isManualRefresh || forceRefetch),
                getSupportTicket().catch(() => null)
            ]);
            setChats(data);
            if (supportTicket) setSupportUnreadCount(supportTicket.unreadCount);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to load conversations");
            }
        } finally {
            setLoading(false);
        }
    };

    // Global Mute State
    const [isMutingGlobal, setIsMutingGlobal] = useState(false);
    const isGlobalMuted = user?.globalMute || false;

    const handleGlobalMuteToggle = async () => {
        try {
            setIsMutingGlobal(true);
            const newGlobalMute = await toggleGlobalMute();
            updateUser({ globalMute: newGlobalMute });
        } catch (err) {
            console.error("Failed to toggle global mute:", err);
        } finally {
            setIsMutingGlobal(false);
        }
    };

    const [isFullscreen, setIsFullscreen] = useState(
        typeof document !== "undefined" ? Boolean(document.fullscreenElement) : false
    );

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if ((document.documentElement as any).webkitRequestFullscreen) {
                    await (document.documentElement as any).webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen toggle error:", err);
        }
    };

    useEffect(() => {
        void fetchChats();
    }, []);

    // Global user discovery search via backend
    useEffect(() => {
        const query = debouncedSearch.trim();
        if (query.length < 1) {
            searchAbortRef.current?.abort();
            setSearchResults([]);
            setSearchingUsers(false);
            return;
        }

        searchAbortRef.current?.abort();
        const controller = new AbortController();
        searchAbortRef.current = controller;

        const performSearch = async () => {
            setSearchingUsers(true);
            try {
                const results = await searchUsers(query, controller.signal);
                setSearchResults(results);
            } catch (err) {
                if (controller.signal.aborted) return;
                setSearchResults([]);
            } finally {
                if (!controller.signal.aborted) {
                    setSearchingUsers(false);
                }
            }
        };

        void performSearch();

        return () => {
            controller.abort();
        };
    }, [debouncedSearch]);

    const userRef = useRef(user);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    // Real-time socket listeners for incoming messages and read receipts
    useEffect(() => {
        const handleReceiveMessage = (message: Message) => {
            setChats((prev) => {
                const idx = prev.findIndex((c) => c._id === message.chat);
                if (idx === -1) {
                    // New chat started externally — refetch to get populated chat details (bypass cache)
                    void fetchChats(false, true);
                    return prev;
                }

                const chat = prev[idx];
                const updatedChat: Chat = {
                    ...chat,
                    lastMessage: {
                        _id: message._id,
                        messageType: message.messageType,
                        text: message.text,
                        mediaUrl: message.mediaUrl,
                        isDeletedForEveryone: message.isDeletedForEveryone,
                        createdAt: message.createdAt,
                    },
                    unreadCount:
                        message.sender !== user?.id
                            ? (chat.unreadCount || 0) + 1
                            : chat.unreadCount,
                    updatedAt: message.createdAt,
                };

                const next = [...prev];
                next.splice(idx, 1);
                next.unshift(updatedChat);

                // Play subtle sound if message came from another participant
                if (message.sender !== user?.id) {
                    try {
                        const currentUser = userRef.current;
                        if (!currentUser?.globalMute && !currentUser?.mutedChats?.includes(message.chat)) {
                            playReceiveSound();
                        }
                    } catch { }
                }

                return next;
            });
        };

        const handleMessageSeen = ({ chatId, markedBy }: { chatId: string, markedBy?: string }) => {
            if (markedBy === user?.id) {
                setChats((prev) =>
                    prev.map((c) => (c._id === chatId ? { ...c, unreadCount: 0 } : c))
                );
            }
        };

        const handleChatDeletedForMe = ({ chatId }: { chatId: string }) => {
            setChats((prev) => prev.filter((c) => c._id !== chatId));
        };

        const handleChatDeletedForEveryone = ({ chatId }: { chatId: string }) => {
            setChats((prev) => prev.filter((c) => c._id !== chatId));
        };

        const handleUserTyping = ({ chatId }: { chatId: string }) => {
            setTypingChats(prev => ({ ...prev, [chatId]: true }));
        };

        const handleUserStopTyping = ({ chatId }: { chatId: string }) => {
            setTypingChats(prev => ({ ...prev, [chatId]: false }));
        };

        const handleSupportMessage = () => {
            setSupportUnreadCount(prev => prev + 1);
            try {
                const currentUser = userRef.current;
                if (!currentUser?.globalMute) {
                    playReceiveSound();
                }
            } catch {}
        };

        const handleSupportTicketUpdated = (ticket: any) => {
            setSupportUnreadCount(ticket.unreadCount);
        };

        socket.on("receive_message", handleReceiveMessage);
        socket.on("message_seen", handleMessageSeen);
        socket.on("chat_deleted_for_me", handleChatDeletedForMe);
        socket.on("chat_deleted_for_everyone", handleChatDeletedForEveryone);
        socket.on("user_typing", handleUserTyping);
        socket.on("user_stop_typing", handleUserStopTyping);
        socket.on("support_message", handleSupportMessage);
        socket.on("support_ticket_updated", handleSupportTicketUpdated);

        return () => {
            socket.off("receive_message", handleReceiveMessage);
            socket.off("message_seen", handleMessageSeen);
            socket.off("chat_deleted_for_me", handleChatDeletedForMe);
            socket.off("chat_deleted_for_everyone", handleChatDeletedForEveryone);
            socket.off("user_typing", handleUserTyping);
            socket.off("user_stop_typing", handleUserStopTyping);
            socket.off("support_message", handleSupportMessage);
            socket.off("support_ticket_updated", handleSupportTicketUpdated);
        };
    }, [user?.id]);

    // Handle opening or creating a chat with a discovered user
    const handleOpenChatWithUser = async (targetUserId: string) => {
        try {
            setOpeningChatUserId(targetUserId);
            const chat = await createOrGetChat(targetUserId);
            setSearchQuery("");
            setSearchResults([]);
            navigate(`/chats/${chat._id}`);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Unable to open conversation");
            }
        } finally {
            setOpeningChatUserId(null);
        }
    };

    // Delete chat handlers
    const handleDeleteForMe = async (chatId: string) => {
        try {
            setDeletingChatId(chatId);
            await deleteChatForMe(chatId);
            setChats((prev) => prev.filter((c) => c._id !== chatId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete chat");
        } finally {
            setDeletingChatId(null);
            setMenuChatId(null);
        }
    };

    const handleDeleteForEveryone = async (chatId: string) => {
        try {
            setDeletingChatId(chatId);
            await deleteChatForEveryone(chatId);
            setChats((prev) => prev.filter((c) => c._id !== chatId));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete chat");
        } finally {
            setDeletingChatId(null);
            setMenuChatId(null);
        }
    };

    // Filter existing chats based on search query (local instant filter)
    const filteredChats = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return chats;

        return chats.filter((chat) => {
            const otherUser = chat.participants.find((p) => p._id !== user?.id);
            if (!otherUser) return false;

            const usernameMatch = otherUser.username.toLowerCase().includes(query);
            const fullName = `${otherUser.name?.firstName || ""} ${otherUser.name?.lastName || ""}`.toLowerCase();
            const nameMatch = fullName.includes(query);
            const messageMatch = chat.lastMessage?.text?.toLowerCase().includes(query) || false;

            return usernameMatch || nameMatch || messageMatch;
        });
    }, [chats, searchQuery, user?.id]);

    // Render formatted last message preview
    const renderLastMessagePreview = (chat: Chat) => {
        if (!chat.lastMessage) {
            return <span className="text-muted-foreground italic">No messages yet</span>;
        }

        if (chat.lastMessage.isDeletedForEveryone) {
            return (
                <span className="flex items-center gap-1 text-muted-foreground italic">
                    <Trash2 className="size-3.5" />
                    <span>This message was deleted</span>
                </span>
            );
        }

        switch (chat.lastMessage.messageType) {
            case "image":
                return (
                    <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        <ImageIcon className="size-3.5 text-muted-foreground" />
                        <span>Photo</span>
                    </span>
                );
            case "voice":
                return (
                    <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        <Mic className="size-3.5 text-muted-foreground" />
                        <span>Voice note</span>
                    </span>
                );

            default:
                return (
                    <span className="truncate text-muted-foreground">
                        {chat.lastMessage.text || ""}
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen w-full bg-background bg-ambient-glow text-foreground flex flex-col items-center">
            {/* Top Navigation Bar */}
            <header className="w-full border-b border-border/80 bg-card/70 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5">
                        <div className="size-10 rounded-2xl bg-gradient-chat-sender flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <MessageCircle className="size-5" />
                        </div>
                        <div className="hidden md:block">
                            <h1 className="text-lg font-bold leading-none tracking-tight text-foreground">
                                Pinsta Chat
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                End-to-end encrypted
                            </p>
                        </div>
                    </div>

                    {/* Actions & Profile Pill */}
                    <div className="flex items-center gap-2">
                        {/* Global Mute Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isMutingGlobal}
                            onClick={handleGlobalMuteToggle}
                            aria-label="Toggle Global Mute"
                            className={cn(
                                "size-9 transition-colors",
                                isGlobalMuted ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {isMutingGlobal ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : isGlobalMuted ? (
                                <BellOff className="size-4" />
                            ) : (
                                <Bell className="size-4" />
                            )}
                        </Button>

                        {/* Theme Toggle Button */}
                        <ThemeToggle />

                        {/* Profile Link */}
                        <Link to="/profile">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-2 gap-2 text-muted-foreground hover:text-foreground"
                            >
                                <img
                                    src={user?.avatarUrl || DEFAULT_AVATAR}
                                    alt={user?.username || "Profile"}
                                    className="size-6 rounded-full object-cover border border-border"
                                />

                            </Button>
                        </Link>

                        {/* Logout Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void logout()}
                            aria-label="Sign out"
                            className="size-9 text-muted-foreground hover:text-destructive transition-colors"
                        >
                            <LogOut className="size-4" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Rate Limit Toast */}
            <AnimatePresence>
                {rateLimitMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500/90 text-white text-xs font-medium shadow-lg backdrop-blur-sm"
                    >
                        {rateLimitMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Container (pull-to-refresh enabled) */}
            <main
                ref={mainRef}
                className="w-full max-w-180 px-4 py-6 flex-1 flex flex-col gap-5 overflow-y-auto"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Pull-to-Refresh Indicator */}
                <AnimatePresence>
                    {pullDistance > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: pullDistance }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center justify-center w-full -mt-6 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <RefreshCw
                                    className={cn(
                                        "size-4 transition-transform",
                                        pullRefreshing && "animate-spin",
                                        !pullRefreshing && pullDistance >= PULL_THRESHOLD && "text-primary"
                                    )}
                                    style={{
                                        transform: pullRefreshing
                                            ? undefined
                                            : `rotate(${Math.min(pullDistance / PULL_THRESHOLD, 1) * 360}deg)`,
                                    }}
                                />
                                <span>
                                    {pullRefreshing
                                        ? "Refreshing..."
                                        : pullDistance >= PULL_THRESHOLD
                                            ? "Release to refresh"
                                            : "Pull down to refresh"}
                                </span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search conversations or discover people by @username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-9 h-11 bg-card border-border/80 shadow-xs text-sm rounded-xl"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
                            aria-label="Clear search"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Server / Load Error Banner */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm"
                        role="alert"
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="size-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                        <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => void fetchChats()}
                        >
                            Retry
                        </Button>
                    </motion.div>
                )}

                {/* =========================================================================
                    USER DISCOVERY SECTION (Shown when searching)
                   ========================================================================= */}
                {searchQuery.trim().length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">
                            <span>People Search</span>
                            {searchingUsers && (
                                <span className="flex items-center gap-1 text-[11px] normal-case text-muted-foreground">
                                    <Loader2 className="size-3 animate-spin" />
                                    Searching...
                                </span>
                            )}
                        </div>

                        {searchResults.length === 0 && !searchingUsers ? (
                            <p className="text-xs text-muted-foreground px-1 py-2 italic">
                                No new users found matching &ldquo;{searchQuery}&rdquo;.
                            </p>
                        ) : (
                            <div className="space-y-1.5">
                                {searchResults.map((searchUser) => {
                                    const isOpening = openingChatUserId === searchUser._id;
                                    const displayName =
                                        searchUser.name?.firstName
                                            ? `${searchUser.name.firstName} ${searchUser.name.lastName || ""}`.trim()
                                            : `@${searchUser.username}`;

                                    return (
                                        <div
                                            key={searchUser._id}
                                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 transition-colors border border-transparent hover:border-border/60"
                                        >
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={searchUser.avatarUrl || DEFAULT_AVATAR}
                                                    alt={searchUser.username}
                                                    className="size-10 rounded-full object-cover border border-border"
                                                />
                                                <div>
                                                    <h3 className="text-sm font-semibold leading-tight">
                                                        {displayName}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        @{searchUser.username}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                disabled={isOpening}
                                                onClick={() => handleOpenChatWithUser(searchUser._id)}
                                                className="h-8 gap-1.5 text-xs font-medium"
                                            >
                                                {isOpening ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <>
                                                        <span>Message</span>
                                                        <ArrowRight className="size-3" />
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* =========================================================================
                    ACTIVE CONVERSATIONS LIST
                   ========================================================================= */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1 mb-2 uppercase tracking-wider">
                        <span>Conversations</span>
                    </div>

                    {/* Loading Skeletons */}
                    {loading ? (
                        <div className="space-y-2.5">
                            {[1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border/60 bg-card/60"
                                >
                                    <Skeleton className="size-12 rounded-full shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <Skeleton className="h-4 w-1/3" />
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                        <Skeleton className="h-3.5 w-2/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredChats.length === 0 ? (
                        /* Empty State */
                        <div className="flex-1 min-h-75 flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-border bg-card/40 my-auto">
                            <div className="size-14 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground mb-4 shadow-xs">
                                <Sparkles className="size-7 stroke-[1.5]" />
                            </div>
                            <h2 className="text-base font-semibold text-foreground">
                                {searchQuery ? "No matching conversations" : "No chats yet"}
                            </h2>
                            <p className="text-xs text-muted-foreground max-w-70 mt-1.5 leading-relaxed">
                                {searchQuery
                                    ? "Try searching for a different username in the search box above to start a new chat."
                                    : "Connect with friends and colleagues. Search for people above to start your first encrypted conversation!"}
                            </p>
                            {!searchQuery && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => searchInputRef.current?.focus()}
                                    className="mt-5 gap-2 h-9 text-xs font-medium"
                                >
                                    <Plus className="size-3.5" />
                                    <span>Discover People</span>
                                </Button>
                            )}
                        </div>
                    ) : (
                        /* Conversation Cards */
                        <div className="space-y-1.5">
                            <AnimatePresence initial={false}>
                                {filteredChats.map((chat) => {
                                    const otherUser = chat.participants.find(
                                        (p) => p._id !== user?.id
                                    );
                                    if (!otherUser) return null;

                                    const online = isOnline(otherUser._id);

                                    const isBlocked = chat.blockedByMe || chat.blockedByThem;

                                    const displayName =
                                        otherUser.name?.firstName
                                            ? `${otherUser.name.firstName} ${otherUser.name.lastName || ""}`.trim()
                                            : `@${otherUser.username}`;

                                    return (
                                        <motion.div
                                            key={chat._id}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onTouchStart={() => handleChatTouchStart(chat._id)}
                                                    onTouchEnd={handleChatTouchEnd}
                                                    onTouchMove={handleChatTouchEnd}
                                                    onContextMenu={(e) => {
                                                        if (window.matchMedia("(max-width: 768px)").matches) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    onClick={(e) => {
                                                        if (wasLongPress) {
                                                            e.preventDefault();
                                                            setWasLongPress(false);
                                                            return;
                                                        }
                                                        navigate(`/chats/${chat._id}`);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-3.5 p-3 rounded-xl text-left",
                                                        "border border-border/60 bg-card hover:bg-secondary/70 active:bg-secondary transition-all duration-150 shadow-2xs group",
                                                        isBlocked && "opacity-60 bg-muted/30"
                                                    )}
                                                >
                                                    {/* Avatar with live presence ring */}
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={otherUser.avatarUrl || DEFAULT_AVATAR}
                                                            alt={otherUser.username}
                                                            className="size-12 rounded-full object-cover border border-border group-hover:scale-102 transition-transform"
                                                        />
                                                        {online && (
                                                            <span
                                                                className="absolute bottom-0 right-0 size-3.5 rounded-full bg-emerald-500 ring-2 ring-card"
                                                                title="Online"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Chat Details */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <h3 className="text-[14px] font-semibold text-foreground truncate">
                                                                    {displayName}
                                                                </h3>


                                                                {isBlocked && (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-destructive/10 text-destructive">
                                                                        <UserX className="size-2.5" />
                                                                        Blocked
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Timestamp */}
                                                            {chat.lastMessage && (
                                                                <span className="text-[11px] text-emerald-500 dark:text-emerald-400 shrink-0 font-medium">
                                                                    {new Date(chat.lastMessage.createdAt).toLocaleTimeString('en-US', {
                                                                        hour: 'numeric',
                                                                        minute: '2-digit',
                                                                        hour12: true
                                                                    }).toUpperCase()}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Message Preview & Unread Badge */}
                                                        <div className="flex items-center justify-between gap-2 mt-1">
                                                            <div className="text-[13px] leading-tight truncate flex-1 h-4">
                                                                {typingChats[chat._id] && !isBlocked ? (
                                                                    <span className="text-primary font-medium animate-pulse">
                                                                        Typing...
                                                                    </span>
                                                                ) : (
                                                                    renderLastMessagePreview(chat)
                                                                )}
                                                            </div>

                                                            {chat.unreadCount > 0 && (
                                                                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-semibold shrink-0 shadow-xs animate-in zoom-in-50">
                                                                    {chat.unreadCount > 99
                                                                        ? "99+"
                                                                        : chat.unreadCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* 3-dot menu trigger (visible on desktop hover or when menu is open) */}
                                                    <div
                                                        className={cn(
                                                            "shrink-0 hidden md:flex transition-opacity",
                                                            menuChatId === chat._id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                        )}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setMenuChatId(menuChatId === chat._id ? null : chat._id);
                                                            }}
                                                            className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                                            aria-label="Chat options"
                                                        >
                                                            <MoreVertical className="size-4" />
                                                        </button>
                                                    </div>
                                                </button>

                                                {/* Context Menu Dropdown */}
                                                <AnimatePresence>
                                                    {menuChatId === chat._id && (
                                                        <>
                                                            {/* Invisible backdrop to close menu */}
                                                            <div
                                                                className="fixed inset-0 z-30"
                                                                onClick={() => setMenuChatId(null)}
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                transition={{ duration: 0.12 }}
                                                                className="absolute right-2 top-full mt-1 z-40 w-52 rounded-xl border border-border bg-card shadow-lg p-1 space-y-0.5"
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={deletingChatId === chat._id}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        void handleDeleteForMe(chat._id);
                                                                    }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                                                                >
                                                                    <Trash2 className="size-3.5 text-muted-foreground" />
                                                                    <span>Delete for me</span>
                                                                </button>

                                                                {/* H5: Only show Delete for Both to the creator */}
                                                                {(chat.createdBy ? chat.createdBy === user?.id : chat.participants[0]?._id === user?.id) && (
                                                                    <button
                                                                        type="button"
                                                                        disabled={deletingChatId === chat._id}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            void handleDeleteForEveryone(chat._id);
                                                                        }}
                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                        <span>Delete for both</span>
                                                                    </button>
                                                                )}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Floating Fullscreen Trigger for Mobile / Web */}
            <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
                className="fixed bottom-5 right-5 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card/90 border border-border shadow-lg backdrop-blur-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card active:scale-95 transition-all cursor-pointer hover:shadow-indigo-500/10"
            >
                {isFullscreen ? (
                    <>
                        <Minimize2 className="size-3.5 text-primary" />
                        <span>Exit Fullscreen</span>
                    </>
                ) : (
                    <>
                        <Maximize2 className="size-3.5 text-primary" />
                        <span>Full Screen</span>
                    </>
                )}
            </button>

            {/* Developer Contact Button */}
            <button
                type="button"
                onClick={() => navigate("/support")}
                aria-label="Developer Contact"
                className="fixed bottom-5 left-5 z-30 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card/90 border border-border shadow-lg backdrop-blur-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card active:scale-95 transition-all cursor-pointer hover:shadow-emerald-500/10"
            >
                <div className="relative">
                    <Bug className="size-4 text-emerald-500" />
                    {supportUnreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-3.5 h-3.5 px-1 rounded-full bg-destructive text-[9px] text-white font-bold animate-pulse">
                            {supportUnreadCount}
                        </span>
                    )}
                </div>
                <span>Dev Contact</span>
            </button>
        </div>
    );
};

export default ChatList;