import axios from "axios";

import { envConfig } from "../config/env";

let accessToken: string | null = null;
let onTokenRefresh:
    | ((token: string) => void)
    | null = null;

export const setTokenRefreshHandler = (
    handler: (token: string) => void
) => {
    onTokenRefresh = handler;
};

export const setAccessToken = (
    token: string | null
) => {
    accessToken = token;
};

const axiosClient = axios.create({
    baseURL: envConfig.API_URL,
    withCredentials: true,
});

axiosClient.interceptors.request.use(
    (config) => {
        if (accessToken) {
            config.headers.Authorization =
                `Bearer ${accessToken}`;
        }

        return config;
    }
);

let refreshPromise: Promise<string> | null = null;

axiosClient.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (!originalRequest) {
            return Promise.reject(error);
        }

        if (
            error.response?.status !== 401 ||
            originalRequest._retry
        ) {
            return Promise.reject(error);
        }

        /*
         * Never try to refresh if refresh itself failed.
         */
        if (
            originalRequest.url?.includes(
                "/auth/refresh"
            )
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            if (!refreshPromise) {
                refreshPromise = axios
                    .post(
                        `${envConfig.API_URL}/auth/refresh`,
                        {},
                        {
                            withCredentials: true,
                        }
                    )
                    .then((response) => {
                        const token =
                            response.data.accessToken;

                        setAccessToken(token);
                        onTokenRefresh?.(token);
                        return token;
                    })
                    .finally(() => {
                        refreshPromise = null;
                    });
            }

            const token =
                await refreshPromise;

            originalRequest.headers.Authorization =
                `Bearer ${token}`;

            return axiosClient(originalRequest);
        } catch (err) {
            setAccessToken(null);

            return Promise.reject(err);
        }
    }
);

export default axiosClient;