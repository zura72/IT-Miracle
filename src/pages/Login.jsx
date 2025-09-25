// src/pages/Login.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../AppProvider";
import { useNavigate } from "react-router-dom";
import { loginRequest, silentRequest } from "../authConfig";

/**
 * Login.jsx - Fixed version dengan handling MSAL yang lebih baik
 */

const isDev = process.env.NODE_ENV === "development";

const dev = {
  log: (...a) => isDev && console.log(...a),
  info: (...a) => isDev && console.info(...a),
  warn: (...a) => isDev && console.warn(...a),
  error: (...a) => isDev && console.error(...a),
};

export default function Login() {
  const { instance, accounts, inProgress } = useMsal();
  const { rememberMe, setRememberMe } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [msalError, setMsalError] = useState(null);

  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const navigatedRef = useRef(false);
  const loginAttemptedRef = useRef(false);

  // ============== Load Config ==============
  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      try {
        setConfigError(null);

        // Coba load config dari berbagai endpoint
        const endpoints = [
          "/config.json",
          "/api/config",
        ];

        let found = null;
        for (const u of endpoints) {
          try {
            const response = await fetch(u, {
              headers: { Accept: "application/json" },
              cache: "no-store",
            });
            if (response.ok) {
              found = await response.json();
              dev.info("[config] Loaded from:", u);
              break;
            }
          } catch (e) {
            // Continue to next endpoint
          }
        }

        if (!mountedRef.current) return;

        if (found && Array.isArray(found.adminEmails)) {
          setAdminList(found.adminEmails.map((e) => String(e).toLowerCase()));
        } else {
          // Fallback default
          setAdminList(["adminapp@waskitainfrastruktur.co.id"]);
          setConfigError("Menggunakan konfigurasi default");
        }

        setConfigLoaded(true);
      } catch (error) {
        if (!mountedRef.current) return;
        setAdminList(["adminapp@waskitainfrastruktur.co.id"]);
        setConfigLoaded(true);
      }
    };

    loadConfig();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ============== Current Email ==============
  const currentEmail = useMemo(() => {
    const acc = accounts?.[0];
    if (!acc) return "";
    const claims = acc.idTokenClaims || {};
    return String(
      claims.preferred_username || claims.email || acc.username || ""
    ).toLowerCase();
  }, [accounts]);

  // ============== PERBAIKAN: Auto-navigate yang lebih aman ==============
  useEffect(() => {
    if (navigatedRef.current || !configLoaded) return;

    // Hanya navigate jika ada accounts dan tidak sedang proses login
    if (accounts.length > 0 && inProgress === "none") {
      const email = currentEmail;
      if (!email) return;

      const isAdmin = adminList.includes(email);
      dev.log(`[navigation] Email: ${email}, Admin: ${isAdmin}, Redirecting...`);

      navigatedRef.current = true;
      
      // Delay untuk memastikan state konsisten
      setTimeout(() => {
        if (mountedRef.current) {
          navigate(isAdmin ? "/helpdesk/entry" : "/chat", { replace: true });
        }
      }, 500);
    }
  }, [accounts, inProgress, currentEmail, adminList, navigate, configLoaded]);

  // ============== PERBAIKAN: Handle login yang lebih robust ==============
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    if (loginAttemptedRef.current) return;
    loginAttemptedRef.current = true;
    
    setLoading(true);
    setMsalError(null);
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");

    try {
      dev.log("Starting Microsoft login...");

      // Coba silent login pertama
      try {
        dev.log("Attempting silent login...");
        await instance.ssoSilent(silentRequest);
        dev.log("Silent login successful");
        return; // Silent login berhasil, biarkan useEffect handle navigation
      } catch (silentError) {
        dev.log("Silent login failed, will try popup:", silentError);
        
        // Jika silent gagal, buka popup
        try {
          const response = await instance.loginPopup({
            ...loginRequest,
            prompt: "select_account"
          });
          
          dev.log("Popup login successful:", response.account?.username);
        } catch (popupError) {
          // Handle popup errors specifically
          if (popupError.errorCode === "user_cancelled") {
            setMsalError("Login dibatalkan oleh pengguna");
          } else if (popupError.errorCode === "popup_window_error") {
            setMsalError("Popup diblokir browser. Izinkan popup untuk domain ini.");
          } else {
            setMsalError("Login gagal. Silakan coba lagi.");
          }
          throw popupError;
        }
      }
    } catch (error) {
      dev.error("Login process failed:", error);
      if (!mountedRef.current) return;
      
      // Reset login attempted flag untuk allow retry
      loginAttemptedRef.current = false;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // ============== UI States ==============
  
  // Loading config
  if (!configLoaded) {
    return <LoadingScreen message="Memuat konfigurasi sistem..." />;
  }

  // MSAL sedang proses login
  if (inProgress === "login" || loading) {
    return <LoadingScreen message="Menghubungkan ke Microsoft..." />;
  }

  // Error state
  if (msalError) {
    return (
      <LoginLayout configError={configError}>
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{msalError}</span>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="w-full">
          <LoginForm 
            rememberMe={rememberMe} 
            setRememberMe={setRememberMe}
            loading={false}
            onLogin={handleLogin}
          />
        </form>
      </LoginLayout>
    );
  }

  // Normal login state
  return (
    <LoginLayout configError={configError}>
      <form onSubmit={handleLogin} className="w-full">
        <LoginForm 
          rememberMe={rememberMe} 
          setRememberMe={setRememberMe}
          loading={loading}
          onLogin={handleLogin}
        />
      </form>
    </LoginLayout>
  );
}

// ============== Component Subparts ==============

function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Memproses</h2>
        <p className="text-purple-200">{message}</p>
      </div>
    </div>
  );
}

function LoginLayout({ configError, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPgo8L3N2Zz4=')] opacity-10"></div>
      
      <div className="max-w-5xl w-full flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
        {/* Left Panel */}
        <div className="w-full md:w-2/5 bg-gradient-to-br from-[#7159d4] to-[#b681ff] text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')] opacity-10"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-8">IT Asset Management</h1>
            <p className="text-purple-100 mb-6 text-lg leading-relaxed">
              Sistem manajemen aset TI terintegrasi untuk PT Waskita Karya Infrastruktur
            </p>
          </div>
          
          <div className="relative z-10 mt-8">
            <div className="flex items-center justify-start space-x-6 mb-8">
              <img
                src="/Danantara-Indonesia-Logo-2025.png"
                alt="Danantara Indonesia Logo"
                className="h-20 w-auto object-contain opacity-95"
              />
              <img
                src="/logo-wki.png"
                alt="Waskita Infrastruktur Logo"
                className="h-16 w-auto object-contain opacity-95"
              />
            </div>
            <p className="text-sm text-purple-200">
              &copy; {new Date().getFullYear()} PT Waskita Karya Infrastruktur
            </p>
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="w-full md:w-3/5 bg-white p-10 flex flex-col justify-center relative">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-800 mb-3">Masuk ke Sistem</h2>
            <p className="text-gray-600 text-lg">Gunakan akun Microsoft Anda</p>
          </div>
          
          {configError && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start">
              <svg className="w-5 h-5 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{configError}</span>
            </div>
          )}
          
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginForm({ rememberMe, setRememberMe, loading, onLogin }) {
  return (
    <>
      <div className="flex items-center mb-8 justify-center">
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="sr-only"
            />
            <div className={`block w-14 h-7 rounded-full ${rememberMe ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${rememberMe ? 'transform translate-x-7' : ''}`}></div>
          </div>
          <span className="ml-4 text-gray-700 font-medium">Ingat saya</span>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        onClick={onLogin}
        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] text-white font-bold text-lg shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Memproses...
          </>
        ) : (
          <>
            <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4ZM12 14C16.4 14 20 15.8 20 18V20H4V18C4 15.8 7.6 14 12 14Z"/>
            </svg>
            Login dengan Microsoft
          </>
        )}
      </button>
    </>
  );
}