import React from "react";
import ReactDOM from "react-dom/client";

import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { PresenceProvider } from "./context/PresenceContext";
import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <ThemeProvider>

      <AuthProvider>
        <PresenceProvider>
          <AppRoutes />
        </PresenceProvider>
      </AuthProvider>
    </ThemeProvider>

  </React.StrictMode>
);