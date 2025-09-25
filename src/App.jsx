// App.jsx
import React from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import AppRoutes from "./routes";
import { getMsalConfig } from "./authConfig"; // Import fungsi config

// Inisialisasi MSAL di luar komponen
const msalInstance = new PublicClientApplication(getMsalConfig(true));

function AppContent() {
  const isAuthenticated = useIsAuthenticated();
  
  return (
    <ThemeProvider>
      {!isAuthenticated ? <Login /> : <AppRoutes />}
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}