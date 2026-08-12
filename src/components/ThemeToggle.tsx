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
            variant="ghost"
            size={showLabel ? "sm" : "icon"}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className={cn(
                "rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                showLabel ? "h-9 px-3 gap-2 text-xs font-medium" : "size-9",
                className
            )}
        >
            {theme === "dark" ? (
                <Sun className="size-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
                <Moon className="size-4 text-indigo-500 transition-transform rotate-0 hover:-rotate-12" />
            )}
            {showLabel && (
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            )}
        </Button>
    );
};
