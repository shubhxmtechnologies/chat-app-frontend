import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface Props {
    className?: string;
    showLabel?: boolean;
}

export const ThemeToggle = ({ className, showLabel = false }: Props) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            type="button"
            variant="outline"
            size={showLabel ? "sm" : "icon"}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className={cn(
                "rounded-xl border border-border/90 bg-card/90 hover:bg-card text-muted-foreground hover:text-foreground shadow-2xs backdrop-blur-md transition-all active:scale-95 shrink-0",
                showLabel ? "h-9 px-3.5 gap-2 text-xs font-medium" : "size-9",
                className
            )}
        >
            {theme === "dark" ? (
                <Sun className="size-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
                <Moon className="size-4 text-indigo-500 transition-transform rotate-0 hover:-rotate-12" />
            )}
            {showLabel && (
                <span className="text-xs font-semibold">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            )}
        </Button>
    );
};
