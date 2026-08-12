import { useState, useRef, useEffect } from "react";
import {  Square, Trash2, Send,  X, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
    onSendVoice: (file: File, previewUrl: string, clientMessageId: string) => void;
    onCancel: () => void;
}

const VoiceRecorder = ({ onSendVoice, onCancel }: Props) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [micError, setMicError] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<number | null>(null);

    const stopTracks = () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => {
                    try {
                        track.stop();
                    } catch (err) {
                        console.error("Failed to stop track", err);
                    }
                });
                streamRef.current = null;
            }
        } catch (error) {
            console.error("Failed to stop media tracks:", error);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicError(null);
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                try {
                    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                    setAudioBlob(blob);

                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);

                    stopTracks();
                } catch (error) {
                    console.error("Failed to assemble audio blob:", error);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = window.setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= 119) {
                        stopRecording();
                        return 120;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (error) {
            console.error("Microphone access denied or failed:", error);
            setMicError("Microphone access denied. Please allow microphone access in your browser settings.");
        }
    };

    const stopRecording = () => {
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setIsRecording(false);
        } catch (error) {
            console.error("Failed to stop recording:", error);
        }
    };

    const handleDiscard = () => {
        try {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            setAudioBlob(null);
            setAudioUrl(null);
            setRecordingTime(0);
            stopTracks();
            onCancel();
        } catch (error) {
            console.error("Failed to discard recording:", error);
        }
    };

    const handleSend = () => {
        try {
            if (audioBlob && audioUrl) {
                const file = new File([audioBlob], "voice_note.webm", { type: "audio/webm" });
                onSendVoice(file, audioUrl, crypto.randomUUID());
            }
        } catch (error) {
            console.error("Failed to send voice note:", error);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Enter" && audioUrl && audioBlob) {
                e.preventDefault();
                handleSend();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            stopTracks();
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl, audioBlob]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <div className="flex items-center gap-2 p-1.5 w-full bg-background rounded-2xl shadow-sm border border-border/50">
            {micError && (
                <div className="text-destructive text-xs mb-2 px-2 py-1 bg-destructive/10 rounded-md w-full">
                    {micError}
                </div>
            )}
            {!audioUrl ? (
                <>
                    <AnimatePresence mode="popLayout">
                        {isRecording ? (
                            <motion.div
                                key="stop"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={stopRecording}
                                    className="size-8 rounded-full shrink-0 shadow-sm animate-pulse"
                                >
                                    <Square className="size-3.5 fill-current" />
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="start"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                            >
                                <Button
                                    type="button"
                                    variant="default"
                                    size="icon"
                                    onClick={startRecording}
                                    className="size-8 rounded-full shrink-0 shadow-sm bg-pink-500 hover:bg-pink-600 text-white"
                                >
                                    <Circle className="size-3.5 fill-current" />
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex-1 flex items-center gap-3 px-2">
                        {isRecording && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="size-2 bg-destructive rounded-full animate-ping"
                            />
                        )}
                        <span className={cn("text-sm font-semibold tabular-nums tracking-wide transition-colors duration-300", isRecording ? "text-destructive" : "text-muted-foreground")}>
                            {formatTime(recordingTime)}
                        </span>
                        <div className="flex-1" />
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleDiscard}
                        className="size-8 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                        title="Cancel"
                    >
                        <X className="size-4" />
                    </Button>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 w-full"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleDiscard}
                        className="size-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                        title="Discard"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                    
                    <div className="flex-1 bg-secondary/40 rounded-full px-2 flex items-center h-8">
                        <audio src={audioUrl} controls className="h-6 w-full max-w-50" style={{ filter: "sepia(20%) saturate(70%) grayscale(1) contrast(99%) invert(12%)" }} />
                    </div>
                    
                    <Button
                        type="button"
                        onClick={handleSend}
                        className="h-8 px-3 rounded-full bg-gradient-chat-sender hover:opacity-90 text-white text-xs font-semibold shrink-0 gap-1.5 transition-all shadow-md active:scale-95"
                    >
                        Send
                        <Send className="size-3" />
                    </Button>
                </motion.div>
            )}
        </div>
    );
};

export default VoiceRecorder;