import { useState, useRef, useEffect } from "react";

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
        return () => {
            stopTracks();
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "#f3f4f6", borderRadius: "8px" }}>
            {micError && (
                <div style={{ color: "#ef4444", fontSize: "12px", marginBottom: "8px", padding: "4px 8px", background: "#fef2f2", borderRadius: "4px" }}>
                    {micError}
                </div>
            )}
            {!audioUrl ? (
                <>
                    {isRecording ? (
                        <button type="button" onClick={stopRecording} style={{ background: "#ef4444", color: "white", padding: "4px 8px", borderRadius: "4px", border: "none" }}>
                            Stop
                        </button>
                    ) : (
                        <button type="button" onClick={startRecording} style={{ background: "#10b981", color: "white", padding: "4px 8px", borderRadius: "4px", border: "none" }}>
                            Start Recording
                        </button>
                    )}

                    <span style={{ color: isRecording ? "#ef4444" : "gray", fontWeight: "bold", minWidth: "40px" }}>
                        {formatTime(recordingTime)}
                    </span>

                    <button type="button" onClick={handleDiscard} style={{ background: "transparent", border: "none", color: "gray" }}>
                        Cancel
                    </button>
                </>
            ) : (
                <>
                    <audio src={audioUrl} controls style={{ height: "30px", flex: 1 }} />
                    <button type="button" onClick={handleDiscard} style={{ background: "#ef4444", color: "white", padding: "4px 8px", borderRadius: "4px", border: "none" }}>
                        Discard
                    </button>
                    <button type="button" onClick={handleSend} style={{ background: "#0ea5e9", color: "white", padding: "4px 8px", borderRadius: "4px", border: "none" }}>
                        Send
                    </button>
                </>
            )}
        </div>
    );
};

export default VoiceRecorder;