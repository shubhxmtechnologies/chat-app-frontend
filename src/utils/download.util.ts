import axiosClient from "@/api/axiosClient";

/**
 * Downloads a media file reliably across mobile and desktop browsers
 * without redirecting away from the chat screen or opening raw media in a new tab.
 */
export const downloadMediaFile = async (
    mediaUrl: string,
    filename: string,
    messageId?: string
): Promise<void> => {
    if (!mediaUrl) return;

    // 1. Primary: Use dedicated authenticated backend download proxy endpoint
    // This streams the file with Content-Disposition: attachment, has ZERO CORS issues,
    // and returns a blob for direct local download.
    if (messageId) {
        try {
            const response = await axiosClient.get(`/messages/${messageId}/download`, {
                responseType: "blob",
            });
            const rawContentType = response.headers["content-type"];
            const contentType = typeof rawContentType === "string" ? rawContentType : "application/octet-stream";
            const blob = new Blob([response.data], { type: contentType });
            triggerBlobDownload(blob, filename);
            return;
        } catch (apiErr) {
            console.warn("Backend proxy download failed, falling back to direct method:", apiErr);
        }
    }

    // 2. Secondary: If it's a Cloudinary URL, use Cloudinary's native fl_attachment URL transformation
    if (mediaUrl.includes("cloudinary.com") && mediaUrl.includes("/upload/")) {
        const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const attachmentUrl = mediaUrl.replace(
            "/upload/",
            `/upload/fl_attachment:${cleanName}/`
        );

        try {
            const res = await fetch(attachmentUrl);
            if (res.ok) {
                const blob = await res.blob();
                triggerBlobDownload(blob, filename);
                return;
            }
        } catch {
            // Direct download link with fl_attachment forces browser to download rather than navigate
            triggerDirectDownload(attachmentUrl, filename);
            return;
        }
    }

    // 3. Tertiary: Try direct fetch blob (for same-origin or CORS-enabled URLs)
    try {
        const res = await fetch(mediaUrl);
        if (res.ok) {
            const blob = await res.blob();
            triggerBlobDownload(blob, filename);
            return;
        }
    } catch {
        // Fallback
    }

    // 4. Final fallback
    triggerDirectDownload(mediaUrl, filename);
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
};

const triggerDirectDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
