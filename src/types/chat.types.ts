export type MessageType =
    | "text"
    | "image"
    | "sticker"
    | "voice";

export interface ChatUser {
    _id: string;
    username: string;
    avatarUrl: string | null;
    lastSeenAt: string | null;
    bio?: string | null;
    name?: {
        firstName: string;
        lastName?: string | null;
    };
}

export interface LastMessage {
    _id: string;

    messageType: MessageType;

    text: string | null;

    mediaUrl: string | null;

    isDeletedForEveryone: boolean;

    createdAt: string;
}

export interface Chat {
    _id: string;

    participants: ChatUser[];

    lastMessage: LastMessage | null;

    unreadCount: number;

    blockedByMe: boolean;

    blockedByThem: boolean;

    updatedAt: string;
}