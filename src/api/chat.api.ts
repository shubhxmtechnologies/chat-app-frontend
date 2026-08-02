import axios from "axios";

import axiosClient from "./axiosClient";

import type { Chat as ChatType } from "../types/chat.types";

export interface Chat {
    _id: string;
    participants: string[];
    lastMessage: null;
    updatedAt: string;
}

export const createOrGetChat = async (
    otherUserId: string
): Promise<Chat> => {
    try {
        const response =
            await axiosClient.post(
                "/chats",
                {
                    otherUserId,
                }
            );

        return response.data.chat;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Failed to create chat"
            );
        }

        throw error;
    }
};

export const getUserChats =
    async (): Promise<ChatType[]> => {
        try {
            const response =
                await axiosClient.get(
                    "/chats"
                );

            return response.data.chats;
        } catch (error) {
            if (
                axios.isAxiosError(error)
            ) {
                throw new Error(
                    error.response?.data
                        ?.message ??
                    "Failed to load chats"
                );
            }

            throw error;
        }
    };