import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute = ({
    children,
}: ProtectedRouteProps) => {
    const { status } = useAuth();

    /*
     * Silent refresh still running.
     */
    if (status === "loading") {
        return <div>Loader in ProtectedRoute.tsx </div>;

        /*
         * Later you can replace this with
         * a splash screen or loader.
         */
    }

    if (status === "unauthenticated") {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;