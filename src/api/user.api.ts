import axios from "axios";
import axiosClient from "./axiosClient";

export interface SearchUser {
    _id: string;
    username: string;
    avatarUrl: string | null;
    bio?: string | null;
    lastSeenAt?: string | null;
    name?: {
        firstName: string;
        lastName?: string | null;
    };
}

export interface UserProfile {
    _id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    bio: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    name?: {
        firstName: string;
        lastName?: string | null;
    };
    blockedUsers?: string[];
}

export const getProfile = async (): Promise<UserProfile> => {
    try {
        const response = await axiosClient.get("/users/me");
        return response.data.user;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to fetch user profile"
            );
        }
        throw error;
    }
};

export const searchUsers = async (
    query: string,
    signal?: AbortSignal
): Promise<SearchUser[]> => {
    try {
        const response = await axiosClient.get("/users/search", {
            params: {
                q: query,
            },
            signal,
        });

        return response.data.users;
    } catch (error) {
        if (axios.isCancel(error)) {
            throw error;
        }

        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to search users"
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

export const deleteAvatar = async (): Promise<string> => {
    try {
        const response = await axiosClient.delete("/users/me/avatar");
        return response.data.avatarUrl;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to delete avatar"
            );
        }
        throw error;
    }
};

export const updateName = async (
    firstName: string,
    lastName?: string | null
): Promise<{ firstName: string; lastName: string | null }> => {
    try {
        const response = await axiosClient.patch("/users/me/name", {
            firstName,
            lastName: lastName || null,
        });
        return response.data.name;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to update name"
            );
        }
        throw error;
    }
};

export const updateEmail = async (email: string): Promise<string> => {
    try {
        const response = await axiosClient.patch("/users/me/email", { email });
        return response.data.email;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to update email"
            );
        }
        throw error;
    }
};

export const changePassword = async (
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    try {
        await axiosClient.patch("/users/me/password", {
            currentPassword,
            newPassword,
        });
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to change password"
            );
        }
        throw error;
    }
};

export const updateBio = async (bio: string | null): Promise<string | null> => {
    try {
        const response = await axiosClient.patch("/users/me/bio", {
            bio: bio || null,
        });
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

export const blockUser = async (userId: string): Promise<void> => {
    try {
        await axiosClient.post(`/users/me/block/${userId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to block user"
            );
        }
        throw error;
    }
};

export const unblockUser = async (userId: string): Promise<void> => {
    try {
        await axiosClient.post(`/users/me/unblock/${userId}`);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to unblock user"
            );
        }
        throw error;
    }
};

export const getBlockedUsers = async (): Promise<SearchUser[]> => {
    try {
        const response = await axiosClient.get("/users/me/blocked");
        return response.data.blockedUsers;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to fetch blocked users"
            );
        }
        throw error;
    }
};

export const toggleGlobalMute = async (): Promise<boolean> => {
    try {
        const response = await axiosClient.patch("/users/me/mute/global");
        return response.data.globalMute;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to toggle global mute"
            );
        }
        throw error;
    }
};

export const toggleChatMute = async (chatId: string): Promise<string[]> => {
    try {
        const response = await axiosClient.post(`/users/me/mute/chat/${chatId}`);
        return response.data.mutedChats;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ?? "Failed to toggle chat mute"
            );
        }
        throw error;
    }
};