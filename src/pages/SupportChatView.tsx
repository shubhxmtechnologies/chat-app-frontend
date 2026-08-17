import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bug, MessageSquareWarning } from "lucide-react";
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

export default function SupportChatView() {
    const navigate = useNavigate();
    
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
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
        
        try {
            setSending(true);
            const updatedTicket = await sendSupportMessage(text);
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
            <header className="h-18 shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className=" shrink-0 hover:bg-secondary/50 rounded-full"
                        onClick={() => navigate("/")}
                    >
                        <ArrowLeft className="size-5" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <div className="size-11 rounded-full bg-gradient-chat-sender flex items-center justify-center shrink-0 shadow-sm">
                            <Bug className="size-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <h2 className="font-semibold text-[15px] leading-tight flex items-center gap-2">
                                Developer Contact
                            </h2>
                            <span className="text-[13px] text-emerald-500 font-medium">Online</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-center mb-6">
                    <div className="bg-secondary/50 text-muted-foreground text-xs font-medium px-4 py-1.5 rounded-full shadow-sm border border-border/50 text-center max-w-sm flex items-center gap-2">
                        <MessageSquareWarning className="size-4" />
                        Report bugs or request new features directly to the developer.
                    </div>
                </div>
                
                {ticket?.messages.map((msg, idx) => {
                    const isMe = msg.sender === "user";
                    return (
                        <div key={msg._id || idx} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                isMe 
                                    ? "bg-gradient-chat-sender text-white rounded-tr-sm" 
                                    : "bg-card border border-border/40 text-card-foreground rounded-tl-sm"
                            }`}>
                                {msg.text && (
                                    <p className="text-[15px] leading-relaxed wrap-break-words break-all whitespace-pre-wrap">
                                        {renderTextWithLinks(msg.text)}
                                    </p>
                                )}
                                <div className={`text-[10px] mt-1 text-right ${isMe ? "text-indigo-100/80" : "text-muted-foreground"}`}>
                                    {getRelativeTime(msg.createdAt)}
                                </div>
                            </div>
                        </div>
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
                        onSend={(text) => handleSend(text)}
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
