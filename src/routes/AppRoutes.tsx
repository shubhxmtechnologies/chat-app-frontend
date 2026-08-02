import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ChatList from "../pages/ChatList";
import ChatView from "../pages/ChatView";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}

                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* Protected */}

                <Route path="/" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
                <Route path="/chats/:chatId" element={<ProtectedRoute><ChatView /></ProtectedRoute>} />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            {/* <Profile /> */}
                            <div>profile</div>
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