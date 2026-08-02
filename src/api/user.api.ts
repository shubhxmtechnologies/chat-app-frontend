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