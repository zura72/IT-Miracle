// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import AppProvider from './AppProvider';
import './index.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
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
          color: 'white',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>⚠️ Aplikasi Error</h1>
          <p style={{ fontSize: '1.1rem', marginBottom: '30px' }}>
            Terjadi kesalahan yang tidak terduga.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            🔄 Refresh Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize React app
const initializeApp = () => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Error: Root element not found</h1>
        <p>Element dengan id 'root' tidak ditemukan di HTML.</p>
      </div>
    `;
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <BrowserRouter>
            <AppProvider>
              <App />
            </AppProvider>
          </BrowserRouter>
        </ErrorBoundary>
      </React.StrictMode>
    );
    
    // Hide loading screen after render
    setTimeout(() => {
      const loadingScreen = document.getElementById('root-loading');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }
    }, 1500);
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    
    // Fallback UI
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; background: #f8f9fa; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
        <h1 style="color: #dc3545;">🚨 Aplikasi Gagal Dimuat</h1>
        <p style="font-size: 1.1rem; margin: 20px 0;">Silakan refresh halaman atau hubungi administrator.</p>
        <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem;">
          Refresh Halaman
        </button>
      </div>
    `;
  }
};

// Start the app ketika DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}