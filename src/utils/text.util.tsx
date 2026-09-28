import { AppleEmojiText } from "@/components/AppleEmojiText";

export const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    // Regex to match URLs (http, https)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // If text does not contain any links, pass directly to AppleEmojiText
    // so emoji-only messages (1-3 emojis) properly receive the large reaction styling
    if (!urlRegex.test(text)) {
        return <AppleEmojiText text={text} />;
    }

    return text.split(urlRegex).map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 decoration-blue-400/50 hover:decoration-blue-300 transition-colors break-all"
                    onClick={(e) => e.stopPropagation()}
                >
                    {part}
                </a>
            );
        }
        return <AppleEmojiText key={i} text={part} />;
    });
};
