import axios from "axios";

import axiosClient from "./axiosClient";

import type { Message } from "../types/message.types";

export const getMessages = async (
    chatId: string
): Promise<Message[]> => {
    try {
        const response =
            await axiosClient.get(
                `/messages/${chatId}`
            );

        return response.data.messages;
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