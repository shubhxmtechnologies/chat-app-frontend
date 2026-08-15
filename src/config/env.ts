function getEnv(key: string): string {
    const value = import.meta.env[key];

    if (!value) {
        throw new Error(
            `Missing environment variable: ${key}`
        );
    }

    return value;
}

export const envConfig = {
    API_URL: getEnv("VITE_API_URL"),
    VAPID_PUBLIC_KEY: getEnv("VITE_VAPID_PUBLIC_KEY"),
} as const;