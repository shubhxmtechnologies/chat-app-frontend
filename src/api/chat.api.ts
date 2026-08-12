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
        const response = await axiosClient.post("/chats", { otherUserId });
        clearChatsCache();
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

let cachedChats: ChatType[] | null = null;
let chatsPromise: Promise<ChatType[]> | null = null;

export const clearChatsCache = () => {
    cachedChats = null;
    chatsPromise = null;
};

export const updateCachedChat = (chatId: string, updates: Partial<ChatType> | ((prev: ChatType) => ChatType)) => {
    if (cachedChats) {
        let chatFound = false;
        cachedChats = cachedChats.map(chat => {
            if (chat._id === chatId) {
                chatFound = true;
                return typeof updates === 'function' ? updates(chat) : { ...chat, ...updates };
            }
            return chat;
        });
        
        if (chatFound) {
            cachedChats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
            // If the chat isn't in the cache, clear it so it refetches next time
            clearChatsCache();
        }
    }
};

export const getUserChats = async (forceRefetch = false): Promise<ChatType[]> => {
    if (!forceRefetch && cachedChats) return cachedChats;
    if (!forceRefetch && chatsPromise) return chatsPromise;

    try {
        chatsPromise = axiosClient.get("/chats").then((response) => {
            cachedChats = response.data.chats;
            return cachedChats as ChatType[];
        });
        const result = await chatsPromise;
        return result;
    } catch (error) {
        chatsPromise = null;
        if (axios.isAxiosError(error)) {
            throw new Error(error.response?.data?.message ?? "Failed to load chats");
        }
        throw error;
    }
};

export const deleteChatForMe = async (chatId: string): Promise<void> => {
    try {
        await axiosClient.delete(`/chats/${chatId}/me`);
        clearChatsCache();
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to delete chat"
            );
        }
        throw error;
    }
};

export const deleteChatForEveryone = async (chatId: string): Promise<void> => {
    try {
        await axiosClient.delete(`/chats/${chatId}/everyone`);
        clearChatsCache();
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to delete chat for everyone"
            );
        }
        throw error;
    }
};