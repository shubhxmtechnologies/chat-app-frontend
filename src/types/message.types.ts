export interface Message {
    _id: string;

    chat: string;

    sender: string;

    messageType: "text" | "image" | "sticker" | "voice";

    text: string | null;

    mediaUrl: string | null;

    status: "sending" | "sent" | "delivered" | "seen" | "failed";

    clientMessageId: string | null;

    createdAt: string;

    updatedAt: string;

    isEdited: boolean;

    editedAt: string | null;

    isDeletedForEveryone: boolean;

    deletedAt: string | null;
}