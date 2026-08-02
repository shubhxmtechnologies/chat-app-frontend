import axios from "axios";

import axiosClient from "./axiosClient";

export interface SearchUser {
    _id: string;
    username: string;
    avatarUrl: string | null;
}

export const searchUsers = async (
    query: string,
    signal?: AbortSignal
): Promise<SearchUser[]> => {
    try {
        const response = await axiosClient.get(
            "/users/search",
            {
                params: {
                    q: query,
                },
                signal,
            }
        );

        return response.data.users;
    } catch (error) {
        if (axios.isCancel(error)) {
            throw error;
        }

        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Failed to search users"
            );
        }

        throw error;
    }
};

export const uploadAvatar = async (file: File): Promise<string> => {
    try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await axiosClient.patch("/users/me/avatar", formData);
        return response.data.avatarUrl;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to upload avatar"
            );
        }
        throw error;
    }
};

export const updateBio = async (bio: string): Promise<string | null> => {
    try {
        const response = await axiosClient.patch("/users/me/bio", { bio });
        return response.data.bio;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to update bio"
            );
        }
        throw error;
    }
};

export const updateUsername = async (username: string): Promise<string> => {
    try {
        const response = await axiosClient.patch("/users/me/username", { username });
        return response.data.username;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to update username"
            );
        }
        throw error;
    }
};