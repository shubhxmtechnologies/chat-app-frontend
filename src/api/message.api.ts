import axios from "axios";

import axiosClient from "./axiosClient";

import type { Message } from "../types/message.types";

export const getMessages = async (
    chatId: string,
    before?: string
): Promise<{ messages: Message[]; nextCursor: string | null }> => {
    try {
        const response = await axiosClient.get(
            `/messages/${chatId}`,
            {
                params: before ? { before } : undefined,
            }
        );

        return {
            messages: response.data.messages,
            nextCursor: response.data.nextCursor ?? null,
};
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Failed to load messages"
            );
        }

        throw error;
    }
};

export const sendMediaMessage = async (
    chatId: string,
    messageType: "image" | "sticker" | "voice",
    file: File,
    clientMessageId: string
): Promise<{ message: Message }> => {
    try {
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("messageType", messageType);
        formData.append("media", file);
        formData.append("clientMessageId", clientMessageId);

        const response = await axiosClient.post("/messages/media", formData);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to send media"
            );
        }
        throw error;
    }
};

