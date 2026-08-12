import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Skeleton } from "../components/ui/skeleton";

interface PublicRouteProps {
    children: ReactNode;
}

/**
 * Route wrapper for public-only pages (like Login and Register).
 * If the user is already authenticated, redirects them to the main app ("/").
 */
const PublicRoute = ({ children }: PublicRouteProps) => {
    const { status } = useAuth();

    /*
     * Silent refresh / auth verification still running.
     */
    if (status === "loading") {
        return (
            <div className="flex h-screen w-full bg-background overflow-hidden">
                {/* Sidebar Skeleton */}
                <div className="w-full md:w-80 lg:w-96 border-r border-border bg-card/30 flex flex-col">
                    <div className="p-4 border-b border-border/50">
                        <Skeleton className="h-10 w-full rounded-2xl" />
                    </div>
                    <div className="flex-1 p-4 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="size-12 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Main Content Skeleton (hidden on mobile, visible on desktop) */}
                <div className="hidden md:flex flex-1 flex-col relative">
                    <div className="h-16 border-b border-border/50 bg-card/30 flex items-center px-6">
                        <Skeleton className="h-6 w-1/3" />
                    </div>
                    <div className="flex-1 p-6 space-y-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                                <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-64"}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    /*
     * If user is already authenticated, prevent accessing auth pages and redirect to chat list.
     */
    if (status === "authenticated") {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return <>{children}</>;
};

export default PublicRoute;
