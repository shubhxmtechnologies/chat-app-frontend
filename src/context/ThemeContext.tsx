import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext =
    createContext<ThemeContextValue | null>(
        null
    );

const STORAGE_KEY = "theme";

export const ThemeProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [theme, setTheme] =
        useState<Theme>("light");

    /*
     * Load theme on first render.
     */
    useEffect(() => {
        try {
            const storedTheme =
                localStorage.getItem(
                    STORAGE_KEY
                ) as Theme | null;

            if (
                storedTheme === "light" ||
                storedTheme === "dark"
            ) {
                setTheme(storedTheme);
                return;
            }

            const prefersDark =
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches;

            setTheme(
                prefersDark
                    ? "dark"
                    : "light"
            );
        } catch (error) {
            console.error(
                "Failed to load theme:",
                error
            );
        }
    }, []);

    /*
     * Apply theme to <html>
     * and persist it.
     */
    useEffect(() => {
        try {
            document.documentElement.classList.toggle(
                "dark",
                theme === "dark"
            );

            localStorage.setItem(
                STORAGE_KEY,
                theme
            );
        } catch (error) {
            console.error(
                "Failed to apply theme:",
                error
            );
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((previousTheme) =>
            previousTheme === "dark"
                ? "light"
                : "dark"
        );
    };

    const value = useMemo(
        () => ({
            theme,
            toggleTheme,
        }),
        [theme]
    );

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context =
        useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider"
        );
    }

    return context;
};