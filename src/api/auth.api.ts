import axios from "axios";
import axiosClient, {
    setAccessToken,
} from "./axiosClient";

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string | null;
    bio?: string | null;
}

interface LoginData {
    email: string;
    password: string;
}

export const register = async (
    data: RegisterData
) => {
    try {
        const response =
            await axiosClient.post(
                "/auth/register",
                data
            );

        setAccessToken(
            response.data.accessToken
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Request failed"
            );
        }

        console.log(error);
        

        throw error;
    }
};

export const login = async (
    data: LoginData
) => {

    try {
        const response =
            await axiosClient.post(
                "/auth/login",
                data
            );

        setAccessToken(
            response.data.accessToken
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Request failed"
            );
        }

        throw error;
    }
};

export const refresh = async () => {
    try {
        const response =
            await axiosClient.post(
                "/auth/refresh"
            );

        setAccessToken(
            response.data.accessToken
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Request failed"
            );
        }

        throw error;
    }

};

export const logout = async () => {
    try {
        await axiosClient.post(
            "/auth/logout"
        );

        setAccessToken(null);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            throw new Error(
                error.response?.data?.message ??
                "Request failed"
            );
        }

        throw error;
    }

};