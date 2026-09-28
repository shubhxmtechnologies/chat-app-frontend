import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

export const InstallPwaModal = () => {
    const { isInstallable, isInstalled, isIOS, promptInstall } = usePwaInstall();
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window !== "undefined") {
            return sessionStorage.getItem("pwa_prompt_dismissed") === "true";
        }
        return false;
    });

    if (isInstalled || dismissed) return null;
    if (!isInstallable && !isIOS) return null;

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }
        const accepted = await promptInstall();
        if (accepted) {
            setDismissed(true);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        sessionStorage.setItem("pwa_prompt_dismissed", "true");
    };

    return (
        <>
            {/* Floating Minimal Install Banner */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-3 my-2 p-3 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm relative z-30"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Smartphone className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground truncate">
                            Install Pinsta App
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                            Faster access & full-screen chat
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                        size="xs"
                        variant="default"
                        onClick={handleInstallClick}
                        className="rounded-lg text-xs font-medium gap-1 px-2.5 h-7 shadow-xs"
                    >
                        <Download className="size-3" />
                        Install
                    </Button>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </motion.div>

            {/* iOS Safari Home Screen Instructions Modal */}
            <AnimatePresence>
                {showIOSInstructions && (
                    <div
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowIOSInstructions(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm bg-card border border-border/80 rounded-3xl p-5 shadow-2xl relative"
                        >
                            <button
                                type="button"
                                onClick={() => setShowIOSInstructions(false)}
                                className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground"
                            >
                                <X className="size-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="size-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                                    <Smartphone className="size-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-foreground">Install on iPhone / iPad</h3>
                                    <p className="text-xs text-muted-foreground">Add to Home Screen</p>
                                </div>
                            </div>

                            <ol className="space-y-3 text-xs text-foreground/90 my-3">
                                <li className="flex items-start gap-2.5">
                                    <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 mt-0.5">
                                        1
                                    </span>
                                    <span>
                                        Tap the <strong>Share</strong> button <Share className="inline size-3.5 mx-0.5 text-primary" /> in Safari's bottom toolbar.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 mt-0.5">
                                        2
                                    </span>
                                    <span>
                                        Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare className="inline size-3.5 mx-0.5 text-primary" />.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-[10px] shrink-0 mt-0.5">
                                        3
                                    </span>
                                    <span>
                                        Tap <strong>Add</strong> in the top right to launch full-screen!
                                    </span>
                                </li>
                            </ol>

                            <Button
                                className="w-full mt-4 rounded-xl text-xs"
                                variant="secondary"
                                onClick={() => setShowIOSInstructions(false)}
                            >
                                Got it
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};
