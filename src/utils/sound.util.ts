// Web Audio API sound generator & audio utility for rock-solid chat audio feedback

let audioCtx: AudioContext | null = null;
let notificationAudioBuffer: AudioBuffer | null = null;
let isAudioUnlocked = false;

export const getAudioContext = (): AudioContext | null => {
    try {
        if (!audioCtx && typeof window !== "undefined") {
            const AudioContextClass =
                window.AudioContext ||
                (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === "suspended") {
            audioCtx.resume().catch(() => {});
        }
        return audioCtx;
    } catch {
        return null;
    }
};

/**
 * Decodes and stores the notification wav file into an in-memory AudioBuffer
 */
const loadAudioBuffer = async (ctx: AudioContext) => {
    if (notificationAudioBuffer) return notificationAudioBuffer;
    try {
        const response = await fetch("/notification.wav");
        const arrayBuffer = await response.arrayBuffer();
        notificationAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
        return notificationAudioBuffer;
    } catch (e) {
        console.warn("Failed to decode /notification.wav AudioBuffer:", e);
        return null;
    }
};

/**
 * Initializes automatic one-time audio unlocking on the user's first interaction
 */
export const initAudioUnlock = () => {
    if (typeof window === "undefined" || isAudioUnlocked) return;

    const unlock = () => {
        if (isAudioUnlocked) return;
        isAudioUnlocked = true;

        const ctx = getAudioContext();
        if (ctx) {
            ctx.resume().then(() => {
                // Play a brief silent tone to unlock iOS/Safari audio pipeline
                try {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    gain.gain.value = 0.001; // Silent
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(0);
                    osc.stop(ctx.currentTime + 0.001);
                } catch (e) {
                    console.warn("Silent audio unlock failed:", e);
                }

                // Preload and decode audio buffer
                loadAudioBuffer(ctx);
            }).catch((e) => {
                console.warn("Context resume failed:", e);
            });
        }

        window.removeEventListener("pointerdown", unlock, true);
        window.removeEventListener("touchstart", unlock, true);
        window.removeEventListener("keydown", unlock, true);
        window.removeEventListener("click", unlock, true);
    };

    window.addEventListener("pointerdown", unlock, { capture: true, once: true });
    window.addEventListener("touchstart", unlock, { capture: true, once: true });
    window.addEventListener("keydown", unlock, { capture: true, once: true });
    window.addEventListener("click", unlock, { capture: true, once: true });
};

/**
 * Preloads the notification sound into memory so it plays instantly
 */
export const preloadReceiveSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            loadAudioBuffer(ctx);
        }
    } catch (e) {
        console.warn("Failed to preload sound:", e);
    }
};

/**
 * Play crisp message send "pop" tone
 */
export const playSendSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        const now = ctx.currentTime;

        osc.frequency.setValueAtTime(460, now);
        osc.frequency.exponentialRampToValueAtTime(920, now + 0.07);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    } catch (e) {
        console.warn("Send sound error:", e);
    }
};

/**
 * Synthesizes a high quality dual-tone crystal chime as fallback
 */
const playSynthesizedChime = (ctx: AudioContext) => {
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08); // A5
    gain2.gain.setValueAtTime(0.28, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
};

/**
 * Play incoming message notification chime with zero latency and support for concurrent overlapping sounds
 */
export const playReceiveSound = () => {
    try {
        const ctx = getAudioContext();
        if (ctx) {
            if (notificationAudioBuffer) {
                // Zero-latency in-memory buffer playback (supports rapid overlapping messages)
                const source = ctx.createBufferSource();
                const gain = ctx.createGain();
                source.buffer = notificationAudioBuffer;
                gain.gain.setValueAtTime(0.65, ctx.currentTime);
                source.connect(gain);
                gain.connect(ctx.destination);
                source.start(0);
                return;
            }

            // If buffer is still loading, try triggering buffer load and use synthesized chime
            loadAudioBuffer(ctx);
            playSynthesizedChime(ctx);
            return;
        }

        // HTML5 Audio fallback if Web Audio is unsupported
        const fallbackAudio = new Audio("/notification.wav");
        fallbackAudio.volume = 0.65;
        fallbackAudio.play().catch((e) => {
            console.warn("Fallback audio play failed:", e);
        });
    } catch (e) {
        console.warn("Receive sound error:", e);
    }
};
