import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";
import PublicRoute from "./PublicRoute";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChatList from "../pages/ChatList";
import ChatView from "../pages/ChatView";
import Profile from "../pages/Profile";
const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public (Guest only) */}

                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    }
                />

                {/* Protected */}

                <Route path="/" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
                <Route path="/chats/:chatId" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
            />

                {/* 404 */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;