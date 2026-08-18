import React from "react";
import ReactDOM from "react-dom/client";

import AppRoutes from "./routes/AppRoutes";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { PresenceProvider } from "./context/PresenceContext";
import { initAudioUnlock, preloadReceiveSound } from "./utils/sound.util";
import "./index.css";

// Warm up and initialize audio subsystem
initAudioUnlock();
preloadReceiveSound();

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