import { useState } from "react";

// Assuming these static assets exist in your public/stickers folder
const STICKERS = [
    "/stickers/1.png",
    "/stickers/2.png",
    "/stickers/3.png",
    "/stickers/4.png",
];

interface Props {
    onSendSticker: (file: File, previewUrl: string, clientMessageId: string) => void;
}

const StickerPicker = ({ onSendSticker }: Props) => {
    const [sending, setSending] = useState(false);

    const handleSelect = async (url: string) => {
        try {
            setSending(true);
            const response = await fetch(url);
            if (!response.ok) throw new Error("Network response was not ok");

            const blob = await response.blob();
            const filename = url.split('/').pop() || "sticker.png";
            const file = new File([blob], filename, { type: blob.type });

            onSendSticker(file, url, crypto.randomUUID());
        } catch (error) {
            console.error("Failed to fetch sticker asset:", error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ display: "flex", gap: "8px", padding: "8px", background: "#f3f4f6", borderRadius: "8px", marginBottom: "8px", overflowX: "auto" }}>
            {STICKERS.map((url) => (
                <button
                    key={url}
                    type="button"
                    disabled={sending}
                    onClick={() => handleSelect(url)}
                    style={{ background: "none", border: "none", cursor: sending ? "not-allowed" : "pointer" }}
                >
                    <img src={url} alt="Sticker" width={60} height={60} style={{ objectFit: "contain" }} />
                </button>
            ))}
        </div>
    );
};

export default StickerPicker;