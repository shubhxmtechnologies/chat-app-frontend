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

const getInitialTheme = (): Theme => {
    try {
        const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (storedTheme === "light" || storedTheme === "dark") {
            document.documentElement.classList.toggle("dark", storedTheme === "dark");
            return storedTheme;
        }
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const fallbackTheme = prefersDark ? "dark" : "light";
        document.documentElement.classList.toggle("dark", fallbackTheme === "dark");
        return fallbackTheme;
    } catch {
        return "light";
    }
};

export const ThemeProvider = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    /*
     * Listen for OS theme changes if user hasn't explicitly set a preference.
     */
    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                setTheme(e.matches ? "dark" : "light");
            }
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
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