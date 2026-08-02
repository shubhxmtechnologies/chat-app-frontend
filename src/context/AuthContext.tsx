import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    setTokenRefreshHandler,
} from "../api/axiosClient";

import {
    connectSocket,
    disconnectSocket,
} from "../socket/socketClient";

import {
    login as loginApi,
    logout as logoutApi,
    refresh as refreshApi,
    register as registerApi,
} from "../api/auth.api";

import { setAccessToken } from "../api/axiosClient";

type AuthStatus =
    | "loading"
    | "authenticated"
    | "unauthenticated";

interface User {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
}

interface AuthState {
    status: AuthStatus;
    accessToken: string | null;
    user: User | null;
}

interface RegisterInput {
    username: string;
    email: string;
    password: string;
}

interface LoginInput {
    email: string;
    password: string;
}

interface AuthContextValue extends AuthState {
    login: (data: LoginInput) => Promise<void>;
    register: (
        data: RegisterInput
    ) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext =
    createContext<AuthContextValue | null>(
        null
    );

export const AuthProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [auth, setAuth] =
        useState<AuthState>({
            status: "loading",
            accessToken: null,
            user: null,
        });

    /*
     * Keep axios using the latest token.
     */
    useEffect(() => {
        setAccessToken(auth.accessToken);

        if (
            auth.status === "authenticated" &&
            auth.accessToken
        ) {
            try {
                connectSocket(auth.accessToken);
            } catch (error) {
                console.error(
                    "Failed to connect socket:",
                    error
                );
            }

            return;
        }

        disconnectSocket();
    }, [
        auth.status,
        auth.accessToken,
    ]);
    /*
     * Silent refresh on first load.
     */
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const data =
                    await refreshApi();

                setAuth({
                    status: "authenticated",
                    accessToken:
                        data.accessToken,
                    user: data.user,
                });
                
            } catch {
                setAuth({
                    status:
                        "unauthenticated",
                    accessToken: null,
                    user: null,
                });
            }
        };

        void initializeAuth();
    }, []);

    const login = async (
        credentials: LoginInput
    ) => {
        const data = await loginApi(
            credentials
        );

        setAuth({
            status: "authenticated",
            accessToken:
                data.accessToken,
            user: data.user,
        });
    };

    const register = async (
        payload: RegisterInput
    ) => {
        const data =
            await registerApi(payload);

        setAuth({
            status: "authenticated",
            accessToken:
                data.accessToken,
            user: data.user,
        });
    };

    const logout = async () => {
        try {
            await logoutApi();
        } catch (error) {
            console.error(
                "Logout failed:",
                error
            );
        } finally {
            disconnectSocket();

            setAuth({
                status:
                    "unauthenticated",
                accessToken: null,
                user: null,
            });
        }
    };

    const value = useMemo(
        () => ({
            ...auth,
            login,
            register,
            logout,
        }),
        [auth]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context =
        useContext(AuthContext);

    if (!context) {
        throw new Error(
            "useAuth must be used inside AuthProvider"
        );
    }

    return context;
};