// Web Audio API sound generator & audio utility for rock-solid chat audio feedback

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    try {
        if (!audioCtx) {
            const AudioContextClass =
                window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

let receiveAudio: HTMLAudioElement | null = null;

/**
 * Preloads the notification sound so it plays instantly when a message arrives
 */
export const preloadReceiveSound = () => {
    try {
        if (typeof window !== "undefined" && !receiveAudio) {
            receiveAudio = new Audio("/notification.wav");
            receiveAudio.preload = "auto";
            receiveAudio.load(); // Fetch and decode the audio file immediately
        }
    } catch (e) {
        console.warn("Failed to preload sound:", e);
    }
};

/**
 * Play crisp message send "pop/swoosh" tone
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

        gain.gain.setValueAtTime(0.18, now);
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
 * Play incoming message notification chime
 */
export const playReceiveSound = () => {
    try {
        if (!receiveAudio) {
            receiveAudio = new Audio("/notification.wav");
            receiveAudio.preload = "auto";
        }
        receiveAudio.currentTime = 0; // Reset to start
        receiveAudio.play().catch(() => {
            // Web Audio API fallback chime
            const ctx = getAudioContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(587.33, now); // D5
            gain1.gain.setValueAtTime(0.2, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.12);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(880, now + 0.09); // A5
            gain2.gain.setValueAtTime(0.22, now + 0.09);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.09);
            osc2.stop(now + 0.26);
        });
    } catch (e) {
        console.warn("Receive sound error:", e);
    }
};
