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
} as const;