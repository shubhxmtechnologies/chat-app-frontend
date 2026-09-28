import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell,
    CheckCircle2,
    AlertTriangle,
    X,
    Loader2,
    Copy,
    Check,
    Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPushSubscriptionDetails, subscribeUserToPush } from "@/utils/push.util";
import { envConfig } from "@/config/env";
import { cn } from "@/lib/utils";

interface NotificationPushBannerProps {
    compact?: boolean;
    className?: string;
}

export const NotificationPushBanner = ({ compact = false, className }: NotificationPushBannerProps) => {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [isBrave, setIsBrave] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [isBraveGcmIssue, setIsBraveGcmIssue] = useState(false);
    const [copiedBraveUrl, setCopiedBraveUrl] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkStatus = async () => {
            // Check if user dismissed the banner in this session
            if (typeof window !== "undefined" && sessionStorage.getItem("push_banner_dismissed") === "true") {
                return;
            }

            try {
                const details = await getPushSubscriptionDetails();
                if (!isMounted) return;

                setIsBrave(details.isBrave);
                setPermission(details.permission);

                // If not supported, don't show
                if (!details.supported) {
                    setVisible(false);
                    return;
                }

                // If already active and subscribed with granted permission, don't show
                if (details.isSubscribed && details.permission === "granted") {
                    setVisible(false);
                    return;
                }

                // If Brave user has permission granted but subscription is missing (blocked GCM)
                if (details.isBrave && details.permission === "granted" && !details.isSubscribed) {
                    setIsBraveGcmIssue(true);
                }

                setVisible(true);
            } catch (err) {
                console.warn("Error checking notification status for banner:", err);
            }
        };

        void checkStatus();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleEnable = async () => {
        setStatus("loading");
        setErrorMsg("");
        setIsBraveGcmIssue(false);

        try {
            const res = await subscribeUserToPush(envConfig.VAPID_PUBLIC_KEY);
            if (res.success) {
                setStatus("success");
                setTimeout(() => {
                    setVisible(false);
                }, 2200);
            } else {
                setStatus("error");
                setErrorMsg(res.error || "Failed to enable notifications.");
                if (res.code === "BRAVE_GCM_DISABLED" || res.isBrave) {
                    setIsBraveGcmIssue(true);
                }
            }
        } catch (e: any) {
            setStatus("error");
            setErrorMsg(e?.message || "Failed to enable notifications.");
        }
    };

    const handleDismiss = () => {
        setVisible(false);
        sessionStorage.setItem("push_banner_dismissed", "true");
    };

    const handleCopyBraveUrl = async () => {
        try {
            await navigator.clipboard.writeText("brave://settings/privacy");
            setCopiedBraveUrl(true);
            setTimeout(() => setCopiedBraveUrl(false), 2500);
        } catch (e) {
            console.warn("Failed to copy:", e);
        }
    };

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                    "rounded-2xl border shadow-xs transition-all overflow-hidden",
                    compact ? "mx-1 my-1.5 p-2.5" : "mx-3 my-2 p-3",
                    status === "success"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : isBraveGcmIssue
                            ? "bg-orange-500/10 border-orange-500/30"
                            : "bg-card/90 border-border/80 backdrop-blur-md",
                    className
                )}
            >
                {/* Success State */}
                {status === "success" ? (
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="size-4.5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-semibold tracking-tight leading-tight">
                                    Real-time Notifications Active! 🎉
                                </h4>
                                <p className="text-[11px] opacity-80 mt-0.5">
                                    You'll receive instant alerts when someone messages you.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setVisible(false)}
                            className="p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                            aria-label="Close"
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {/* Main Banner Row */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    "size-8 rounded-xl flex items-center justify-center shrink-0",
                                    isBraveGcmIssue
                                        ? "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                                        : "bg-primary/10 text-primary"
                                )}>
                                    {isBraveGcmIssue ? (
                                        <AlertTriangle className="size-4" />
                                    ) : (
                                        <Bell className="size-4" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="text-xs font-semibold tracking-tight text-foreground truncate">
                                            {isBraveGcmIssue
                                                ? "Brave Push Setup Required"
                                                : "Enable Real-Time Notifications"}
                                        </h4>
                                        {isBrave && !isBraveGcmIssue && (
                                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                Brave
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {isBraveGcmIssue
                                            ? "Brave requires Google push messaging to deliver offline alerts."
                                            : "Never miss incoming messages, photos, or voice notes."}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                                {!isBraveGcmIssue ? (
                                    <Button
                                        size="xs"
                                        variant="default"
                                        onClick={handleEnable}
                                        disabled={status === "loading"}
                                        className="h-7 px-3 rounded-xl text-xs font-medium gap-1 shadow-xs"
                                    >
                                        {status === "loading" ? (
                                            <Loader2 className="size-3 animate-spin" />
                                        ) : (
                                            <Bell className="size-3" />
                                        )}
                                        <span>Turn On</span>
                                    </Button>
                                ) : (
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => navigate("/profile")}
                                        className="h-7 px-2.5 rounded-xl text-xs font-medium gap-1 text-foreground"
                                    >
                                        <Settings className="size-3" />
                                        <span>Fix in Settings</span>
                                    </Button>
                                )}

                                <button
                                    type="button"
                                    onClick={handleDismiss}
                                    className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Dismiss banner"
                                >
                                    <X className="size-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Error Message Feedback */}
                        {status === "error" && !isBraveGcmIssue && (
                            <div className="p-2 rounded-xl bg-destructive/10 border border-destructive/20 text-[11px] text-destructive leading-tight flex items-center justify-between gap-2">
                                <span>{errorMsg}</span>
                                {permission === "denied" && (
                                    <Button
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => navigate("/profile")}
                                        className="h-6 px-2 text-[10px] text-destructive hover:bg-destructive/10"
                                    >
                                        Settings
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Brave GCM Instructions Drawer */}
                        {isBraveGcmIssue && (
                            <div className="pt-2 border-t border-orange-500/20 text-[11px] space-y-2 text-foreground">
                                <p className="text-muted-foreground leading-relaxed">
                                    In Brave, copy this link to open privacy settings and enable <strong className="text-foreground">"Use Google services for push messaging"</strong>:
                                </p>
                                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card border border-border/80">
                                    <code className="text-[10px] font-mono font-semibold text-foreground truncate">
                                        brave://settings/privacy
                                    </code>
                                    <Button
                                        size="xs"
                                        variant="secondary"
                                        onClick={handleCopyBraveUrl}
                                        className="h-6 px-2 text-[10px] rounded-md gap-1 shrink-0"
                                    >
                                        {copiedBraveUrl ? (
                                            <>
                                                <Check className="size-3 text-emerald-500" />
                                                <span>Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="size-3" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                    <span className="text-[10px] text-muted-foreground">
                                        Restart Brave after toggling, then click Turn On.
                                    </span>
                                    <Button
                                        size="xs"
                                        variant="default"
                                        onClick={handleEnable}
                                        disabled={status === "loading"}
                                        className="h-6 px-2.5 text-[11px] rounded-md font-semibold bg-gradient-chat-sender text-white"
                                    >
                                        {status === "loading" ? (
                                            <Loader2 className="size-3 animate-spin" />
                                        ) : (
                                            <span>Retry Turn On</span>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};
