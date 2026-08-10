export interface Message {
    _id: string;

    chat: string;

    sender: string;

    messageType: "text" | "image" | "voice";

    text: string | null;

    mediaUrl: string | null;

    replyTo?: {
        _id: string;
        text: string | null;
        messageType: string;
    } | null;

    status: "sending" | "sent" | "seen" | "failed";

    seenAt?: string | null;

    clientMessageId: string | null;

    createdAt: string;

    updatedAt: string;

    isEdited: boolean;

    editedAt: string | null;

    isDeletedForEveryone: boolean;

    deletedAt: string | null;
}