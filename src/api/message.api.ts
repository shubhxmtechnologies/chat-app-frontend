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
    messageType: "image" | "voice",
    file: File,
    clientMessageId: string,
    replyTo?: string
): Promise<{ message: Message }> => {
    try {
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("messageType", messageType);
        formData.append("media", file);
        formData.append("clientMessageId", clientMessageId);
        if (replyTo) formData.append("replyTo", replyTo);

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


export const editMessage = async (messageId: string, text: string): Promise<Message> => {
    try {
        const response = await axiosClient.patch(`/messages/${messageId}`, { text });
        return response.data.message;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to edit message"
            );
        }
        throw error;
    }
};

export const deleteMessageForMe = async (messageId: string): Promise<void> => {
    try {
        await axiosClient.delete(`/messages/${messageId}/me`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to delete message for you"
            );
        }
        throw error;
    }
};

export const deleteMessageForEveryone = async (messageId: string): Promise<void> => {
    try {
        await axiosClient.delete(`/messages/${messageId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to delete message for everyone"
            );
        }
        throw error;
    }
};

export const sendMessage = async (
    chatId: string,
    text: string,
    clientMessageId?: string,
    replyTo?: string
): Promise<{ message: Message }> => {
    try {
        const response = await axiosClient.post("/messages", {
            chatId,
            text,
            clientMessageId,
            replyTo,
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to send message"
            );
        }
        throw error;
    }
};

export const sendMessageBatch = async (
    messages: { chatId: string; text: string; clientMessageId: string }[]
): Promise<any> => {
    try {
        const response = await axiosClient.post("/messages/batch", messages);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to send message batch"
            );
        }
        throw error;
    }
};