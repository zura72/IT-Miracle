import React, { useState, useEffect, useMemo } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { getMsalConfig } from "./authConfig";

export const AuthContext = React.createContext({});

export default function AppProvider({ children }) {
  // State untuk rememberMe dengan default false
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      const saved = localStorage.getItem("rememberMe");
      return saved === "true";
    } catch (error) {
      console.error("Error loading rememberMe from localStorage:", error);
      return false;
    }
  });

  // State untuk track jika MSAL sudah initialized
  const [msalInitialized, setMsalInitialized] = useState(false);
  const [msalError, setMsalError] = useState(null);

  // Persist rememberMe ke localStorage saat berubah
  useEffect(() => {
    try {
      localStorage.setItem("rememberMe", String(rememberMe));
    } catch (error) {
      console.error("Error saving rememberMe to localStorage:", error);
    }
  }, [rememberMe]);

  // Buat MSAL instance dengan error handling
  const msalInstance = useMemo(() => {
    try {
      const config = getMsalConfig(rememberMe);
      console.log("🔧 Creating MSAL instance with config:", {
        rememberMe: rememberMe,
        cacheLocation: rememberMe ? "localStorage" : "sessionStorage",
        redirectUri: config.auth.redirectUri
      });
      
      const instance = new PublicClientApplication(config);
      
      // Initialize MSAL instance
      instance.initialize()
        .then(() => {
          console.log("✅ MSAL initialized successfully");
          setMsalInitialized(true);
          setMsalError(null);
        })
        .catch(error => {
          console.error("❌ MSAL initialization failed:", error);
          setMsalError(error);
          setMsalInitialized(true); // Tetap lanjut meski ada error
        });
      
      return instance;
    } catch (error) {
      console.error("❌ Failed to create MSAL instance:", error);
      setMsalError(error);
      
      // Return fallback instance untuk prevent crash
      return {
        initialize: () => Promise.resolve(),
        getAllAccounts: () => [],
        getActiveAccount: () => null,
        loginRedirect: () => Promise.reject('MSAL not available'),
        logout: () => Promise.resolve(),
        acquireTokenSilent: () => Promise.reject('MSAL not available'),
        handleRedirectPromise: () => Promise.resolve(null)
      };
    }
  }, [rememberMe]);

  // Loading state saat MSAL belum initialized
  if (!msalInitialized) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        flexDirection: 'column'
      }}>
        <div style={{
          border: '4px solid rgba(255,255,255,0.3)',
          borderTop: '4px solid white',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }}></div>
        <p>Menyiapkan sistem autentikasi...</p>
        <p style={{ fontSize: '14px', opacity: '0.8', marginTop: '10px' }}>
          Harap tunggu sebentar
        </p>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Error state jika MSAL gagal initialize
  if (msalError) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>⚠️ Error Konfigurasi</h1>
        <p style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
          Terjadi masalah dengan sistem autentikasi.
        </p>
        <p style={{ fontSize: '1rem', marginBottom: '30px', opacity: '0.9' }}>
          Silakan refresh halaman atau hubungi administrator.
        </p>
        
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'left',
          maxWidth: '500px'
        }}>
          <p style={{ fontSize: '14px', margin: '5px 0' }}>
            <strong>Error:</strong> {msalError?.message || 'Unknown error'}
          </p>
          <p style={{ fontSize: '14px', margin: '5px 0' }}>
            <strong>Remember Me:</strong> {rememberMe ? 'Aktif' : 'Tidak aktif'}
          </p>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#ee5a24',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            marginBottom: '10px'
          }}
        >
          🔄 Refresh Halaman
        </button>
        
        <button 
          onClick={() => setRememberMe(!rememberMe)}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: 'white',
            border: '1px solid white',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Coba {rememberMe ? 'nonaktifkan' : 'aktifkan'} "Ingat Saya"
        </button>
      </div>
    );
  }

  // Context value untuk AuthContext
  const contextValue = {
    rememberMe,
    setRememberMe,
    msalInitialized,
    msalError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      <MsalProvider instance={msalInstance}>
        {children}
      </MsalProvider>
    </AuthContext.Provider>
  );
}