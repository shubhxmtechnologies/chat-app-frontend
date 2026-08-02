import { useCallback } from "react";

const EMOJIS = ["😀", "😂", "🥰", "😎", "🤔", "😢", "😡", "👍", "👎", "🔥", "✨", "❤️"];

interface Props {
    onSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onSelect }: Props) => {
    const handleSelect = useCallback((emoji: string) => {
        try {
            onSelect(emoji);
        } catch (error) {
            console.error("Failed to select emoji:", error);
        }
    }, [onSelect]);

    return (
        <div style={{ display: "flex", gap: "8px", padding: "8px", background: "#f3f4f6", borderRadius: "8px", marginBottom: "8px", flexWrap: "wrap", maxWidth: "220px" }}>
            {EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px" }}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
};

export default EmojiPicker;