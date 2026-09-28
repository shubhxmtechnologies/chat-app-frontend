import { memo, useMemo } from "react";
import * as emojiPkg from "react-emoji-render";
import { cn } from "@/lib/utils";

export interface AppleEmojiTextProps {
    text?: string | null;
    className?: string;
    onlyEmojiClassName?: string;
}

// Safely extract the toArray function from CommonJS / ESM interop in Vite
const toArrayFn: ((text: string, options?: any) => React.ReactNode[]) | null =
    typeof (emojiPkg as any).toArray === "function"
        ? (emojiPkg as any).toArray
        : typeof (emojiPkg as any).default?.toArray === "function"
        ? (emojiPkg as any).default.toArray
        : typeof (emojiPkg as any).default?.default?.toArray === "function"
        ? (emojiPkg as any).default.default.toArray
        : null;

const APPLE_EMOJI_OPTIONS = {
    protocol: "https" as const,
    baseUrl: "//cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/",
    size: "",
    ext: "png" as const,
    className: "apple-emoji",
};

export const AppleEmojiText = memo(({
    text,
    className,
    onlyEmojiClassName = "only-apple-emoji",
}: AppleEmojiTextProps) => {
    if (!text) return null;

    const { nodes, isOnlyEmoji } = useMemo(() => {
        try {
            if (typeof toArrayFn === "function") {
                const elements = toArrayFn(text, APPLE_EMOJI_OPTIONS);
                
                // Count emoji image elements vs non-whitespace text
                let emojiCount = 0;
                let hasOtherText = false;

                for (const el of elements) {
                    if (typeof el === "string") {
                        if (el.trim().length > 0) {
                            hasOtherText = true;
                            break;
                        }
                    } else if (el) {
                        emojiCount++;
                    }
                }

                const onlyEmoji = !hasOtherText && emojiCount >= 1 && emojiCount <= 3;
                return { nodes: elements, isOnlyEmoji: onlyEmoji };
            }
        } catch (err) {
            console.warn("[AppleEmojiText] Render fallback:", err);
        }
        return { nodes: [text], isOnlyEmoji: false };
    }, [text]);

    return (
        <span className={cn(className, isOnlyEmoji && onlyEmojiClassName)}>
            {nodes}
        </span>
    );
});

AppleEmojiText.displayName = "AppleEmojiText";
export default AppleEmojiText;
