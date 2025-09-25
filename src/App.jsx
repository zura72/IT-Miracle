// src/App.jsx
import React from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { useIsAuthenticated } from "@azure/msal-react";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import AppRoutes from "./routes";
import { getMsalConfig } from "./authConfig";

// Error Boundary untuk App Content
class AppContentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AppContent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white'
        }}>
          <h2>Terjadi masalah pada aplikasi</h2>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Muat Ulang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Komponen utama aplikasi
function AppContent() {
  const isAuthenticated = useIsAuthenticated();
  
  console.log('AppContent - Auth status:', isAuthenticated);
  
  return (
    <ThemeProvider>
      <AppContentErrorBoundary>
        {!isAuthenticated ? <Login /> : <AppRoutes />}
      </AppContentErrorBoundary>
    </ThemeProvider>
  );
}

// Buat MSAL instance dengan error handling
let msalInstance;

try {
  const msalConfig = getMsalConfig(true);
  console.log('MSAL Config:', {
    auth: {
      clientId: msalConfig.auth.clientId ? '✅ Set' : '❌ Missing',
      authority: msalConfig.auth.authority ? '✅ Set' : '❌ Missing',
      redirectUri: msalConfig.auth.redirectUri
    },
    environment: process.env.NODE_ENV
  });
  
  msalInstance = new PublicClientApplication(msalConfig);
  
  // Initialize MSAL
  msalInstance.initialize().then(() => {
    console.log('✅ MSAL initialized successfully');
  }).catch(error => {
    console.error('❌ MSAL initialization failed:', error);
  });
  
} catch (error) {
  console.error('❌ Failed to create MSAL instance:', error);
  
  // Fallback instance untuk prevent crash
  msalInstance = {
    initialize: () => Promise.resolve(),
    getAllAccounts: () => [],
    getActiveAccount: () => null,
    loginRedirect: () => Promise.reject('MSAL not available'),
    logout: () => Promise.resolve(),
    acquireTokenSilent: () => Promise.reject('MSAL not available')
  };
}

// Komponen App utama
export default function App() {
  const [msalReady, setMsalReady] = React.useState(false);

  React.useEffect(() => {
    // Check if MSAL is ready
    if (msalInstance && msalInstance.initialize) {
      msalInstance.initialize().then(() => {
        setMsalReady(true);
      }).catch(() => {
        setMsalReady(true); // Continue even if MSAL fails
      });
    } else {
      setMsalReady(true);
    }
  }, []);

  if (!msalReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Menyiapkan autentikasi...</p>
        </div>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}