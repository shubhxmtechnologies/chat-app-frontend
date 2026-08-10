import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
    src: string;
    isMine: boolean;
}

const VoicePlayer = ({ src, isMine }: Props) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration;
        if (total > 0) {
            setProgress((current / total) * 100);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return;
        const value = Number(e.target.value);
        const seekTime = (value / 100) * duration;
        audioRef.current.currentTime = seekTime;
        setProgress(value);
    };

    const formatTime = (secs: number) => {
        if (!secs || isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    };

    return (
        <div className="flex items-center gap-2.5 w-full max-w-[220px]">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                className="hidden"
            />
            
            <button
                type="button"
                onClick={togglePlay}
                className={cn(
                    "flex items-center justify-center size-8 rounded-full shrink-0 transition-transform active:scale-95 shadow-sm",
                    isMine
                        ? "bg-white text-indigo-500 hover:bg-white/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
            >
                {isPlaying ? (
                    <Pause className="size-4 fill-current" />
                ) : (
                    <Play className="size-4 fill-current ml-0.5" />
                )}
            </button>

            <div className="flex flex-col flex-1 gap-1">
                <div className="relative w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex items-center">
                    <motion.div
                        className={cn(
                            "absolute left-0 h-full rounded-full",
                            isMine ? "bg-white" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                        layout
                    />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={handleSeek}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                
                <div className={cn(
                    "flex items-center justify-between text-[9px] font-medium tracking-wide",
                    isMine ? "text-white/80" : "text-muted-foreground"
                )}>
                    <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default VoicePlayer;
