import axiosClient from "./axiosClient";

export interface SupportMessage {
    _id: string;
    sender: "user" | "developer";
    text: string | null;
    mediaUrl: string | null;
    createdAt: string;
}

export interface SupportTicket {
    _id: string;
    user: string;
    messages: SupportMessage[];
    canSend: boolean;
    isBlocked: boolean;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
}

export const getSupportTicket = async (): Promise<SupportTicket> => {
    const res = await axiosClient.get("/support");
    return res.data.ticket;
};

export const sendSupportMessage = async (text: string): Promise<SupportTicket> => {
    const res = await axiosClient.post("/support/message", { text });
    return res.data.ticket;
};

export const markSupportRead = async (): Promise<SupportTicket> => {
    const res = await axiosClient.post("/support/read");
    return res.data.ticket;
};
