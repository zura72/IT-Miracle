// src/pages/Login.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../AppProvider";
import { useNavigate } from "react-router-dom";
import { redirectRequest } from "../authConfig";

/**
 * Login.jsx - Fixed version untuk production
 */

const isDev = process.env.NODE_ENV === "development";

const dev = {
  log: (...a) => isDev && console.log(...a),
  info: (...a) => isDev && console.info(...a),
  warn: (...a) => isDev && console.warn(...a),
  debug: (...a) => isDev && console.debug(...a),
  error: (...a) => isDev && console.error(...a),
};

export default function Login() {
  const { instance, accounts, inProgress } = useMsal();
  const { rememberMe, setRememberMe } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const [msalConfig, setMsalConfig] = useState(null);

  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const navigatedRef = useRef(false);
  const redirectInProgressRef = useRef(false);

  // ============== PERBAIKAN: Load MSAL config dengan environment aware ==============
  useEffect(() => {
    const loadMsalConfig = async () => {
      try {
        const { getMsalConfig } = await import("../authConfig");
        const config = getMsalConfig(rememberMe);
        setMsalConfig(config);
        
        dev.log('MSAL Config loaded:', {
          redirectUri: config.auth.redirectUri,
          environment: process.env.NODE_ENV
        });
      } catch (error) {
        console.error('Error loading MSAL config:', error);
      }
    };

    loadMsalConfig();
  }, [rememberMe]);

  // ============== helper: fetch JSON dengan timeout ==============
  const fetchJsonSilent = async (url, { timeoutMs = 3500 } = {}) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status !== 404) dev.debug(`[config] ${url} -> ${res.status}`);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e) {
      dev.debug(`[config] ${url} gagal: ${e?.name || "Error"}`);
      return null;
    } finally {
      clearTimeout(t);
    }
  };

  // =============================== load config =================================
  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      setConfigError(null);

      // PERBAIKAN: Gunakan absolute URL berdasarkan environment
      const baseUrl = window.location.origin;
      const endpoints = [
        `${baseUrl}/config.json`,
        `${baseUrl}/api/config`,
        "/config.json",
        "/api/config",
        "http://localhost:3001/api/config"
      ];

      // Hapus duplicate URLs
      const uniqueEndpoints = [...new Set(endpoints)];

      let found = null;
      for (const u of uniqueEndpoints) {
        dev.debug("[config] mencoba:", u);
        const json = await fetchJsonSilent(u);
        if (json && typeof json === "object") {
          found = json;
          dev.info("[config] OK dari:", u);
          break;
        }
      }

      if (!mountedRef.current) return;

      if (found && Array.isArray(found.adminEmails)) {
        setAdminList(found.adminEmails.map((e) => String(e).toLowerCase()));
        setConfigError(null);
      } else {
        // Fallback default
        setAdminList(["adminapp@waskitainfrastruktur.co.id"]);
        setConfigError("Server config tidak tersedia, menggunakan data default");
      }

      setConfigLoaded(true);
    };

    loadConfig();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // =========================== derive current email ============================
  const currentEmail = useMemo(() => {
    const acc = accounts?.[0];
    if (!acc) return "";
    const claims = acc.idTokenClaims || {};
    return String(
      claims.preferred_username || claims.email || acc.username || ""
    ).toLowerCase();
  }, [accounts]);

  // =========================== PERBAIKAN: Handle redirect response =======================
  useEffect(() => {
    // Handle redirect response ketika kembali dari Microsoft login
    const handleRedirect = async () => {
      if (inProgress === "none" && accounts.length > 0 && !redirectInProgressRef.current) {
        redirectInProgressRef.current = true;
        dev.log("[redirect] Handling redirect response");
        
        // Tunggu sebentar untuk memastikan state sudah stabil
        setTimeout(() => {
          if (mountedRef.current && !navigatedRef.current) {
            handlePostLoginNavigation();
          }
        }, 1000);
      }
    };

    handleRedirect();
  }, [inProgress, accounts]);

  // =========================== PERBAIKAN: Auto-navigate yang benar =======================
  const handlePostLoginNavigation = () => {
    if (navigatedRef.current) return;
    
    if (configLoaded && accounts.length > 0 && inProgress === "none") {
      const isAdmin = adminList.includes(currentEmail);
      dev.log(`[route] email=${currentEmail} admin=${isAdmin}, navigating...`);

      navigatedRef.current = true;
      
      // Navigate ke halaman yang sesuai
      setTimeout(() => {
        navigate(isAdmin ? "/helpdesk/entry" : "/chat", { replace: true });
      }, 100);
    }
  };

  useEffect(() => {
    // Handle auto-navigate untuk kasus silent login
    if (configLoaded && accounts.length > 0 && inProgress === "none" && !redirectInProgressRef.current) {
      handlePostLoginNavigation();
    }
  }, [currentEmail, adminList, navigate, configLoaded, accounts, inProgress]);

  // ================================= PERBAIKAN: Login function dengan environment check ====================================
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    
    if (redirectInProgressRef.current) {
      dev.log("Redirect already in progress, skipping...");
      return;
    }
    
    // PERBAIKAN: Check jika MSAL config sudah loaded
    if (!msalConfig) {
      alert("Sistem sedang memuat konfigurasi. Silakan tunggu sebentar dan coba lagi.");
      return;
    }

    setLoginAttempted(true);
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
    setLoading(true);
    
    try {
      dev.log("Starting login process with redirect...");
      dev.log("Current environment:", process.env.NODE_ENV);
      dev.log("Redirect URI:", msalConfig.auth.redirectUri);
      
      // Coba silent login dulu (jika ada cached token)
      try {
        dev.log("Attempting silent login...");
        const silentResult = await instance.ssoSilent({
          scopes: ["User.Read"],
        });
        dev.log("Silent login successful:", silentResult.account?.username);
        
        // Jika silent login berhasil, langsung navigate
        setLoading(false);
        handlePostLoginNavigation();
        
      } catch (silentError) {
        dev.log("Silent login failed, starting redirect flow...");
        
        // Jika silent gagal, gunakan REDIRECT instead of popup
        redirectInProgressRef.current = true;
        
        // Persist rememberMe setting sebelum redirect
        sessionStorage.setItem('rememberMeDuringRedirect', rememberMe ? 'true' : 'false');
        
        // PERBAIKAN: Gunakan redirect dengan config yang sudah loaded
        await instance.loginRedirect({
          ...redirectRequest,
          scopes: ["User.Read", "openid", "profile"],
        });
        
        // Loading akan tetap true sampai redirect selesai
      }
      
    } catch (error) {
      dev.error("Login error:", error);
      setLoading(false);
      redirectInProgressRef.current = false;
      
      // Only show alert untuk error yang bukan redirect-related
      if (!error.message?.includes("redirect") && !error.message?.includes("popup")) {
        alert("Login gagal! Silakan coba lagi atau periksa koneksi internet Anda.");
      }
    }
  };

  // =============================== Tampilkan UI berdasarkan state ==================================
  
  // Case 1: Masih loading config atau MSAL config
  if (!configLoaded || !msalConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="animate-pulse h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-medium">Memuat konfigurasi sistem...</p>
          <p className="mt-2 text-sm text-gray-500">Environment: {process.env.NODE_ENV}</p>
          <p className="mt-1 text-sm text-gray-500">Domain: {window.location.hostname}</p>
        </div>
      </div>
    );
  }

  // Case 2: Sedang dalam proses redirect login
  if (inProgress === "login" || loading || redirectInProgressRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Mengarahkan ke Login Microsoft</h2>
          <p className="text-purple-200">Anda akan diarahkan ke halaman login Microsoft...</p>
          <div className="mt-4 p-4 bg-white/10 rounded-lg">
            <p className="text-sm text-purple-300">Domain: {window.location.hostname}</p>
            <p className="text-sm text-purple-300">Redirect URI: {msalConfig.auth.redirectUri}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            Refresh Halaman
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Default login screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPgo8L3N2Zz4=')] opacity-10"></div>
      
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-600 rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-pulse-slow delay-1000"></div>
      
      <div className="max-w-5xl w-full flex flex-col md:flex-row rounded-3xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10">
        {/* Left Panel */}
        <div className="w-full md:w-2/5 bg-gradient-to-br from-[#7159d4] to-[#b681ff] text-white p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+CiAgPHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPgogIDxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIi8+Cjwvc3ZnPg==')] opacity-10"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-8">IT Asset Management</h1>
            <p className="text-purple-100 mb-6 text-lg leading-relaxed">
              Sistem manajemen aset TI terintegrasi untuk PT Waskita Karya Infrastruktur
            </p>
            <div className="space-y-4 mt-10">
              <div className="flex items-center">
                <div className="w-10 h-0.5 bg-purple-300 mr-3"></div>
                <span className="text-purple-200">Akses terkontrol dan terjamin</span>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-0.5 bg-purple-300 mr-3"></div>
                <span className="text-purple-200">Manajemen aset yang efisien</span>
              </div>
              <div className="flex items-center">
                <div className="w-10 h-0.5 bg-purple-300 mr-3"></div>
                <span className="text-purple-200">Laporan real-time</span>
              </div>
            </div>
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
        
        {/* Right Panel - Login Form */}
        <div className="w-full md:w-3/5 bg-white p-10 flex flex-col justify-center relative">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-800 mb-3">Masuk ke Sistem</h2>
            <p className="text-gray-600 text-lg">Gunakan akun Microsoft Anda untuk mengakses sistem</p>
            <div className="mt-2 text-sm text-gray-500">
              Environment: {process.env.NODE_ENV} | Domain: {window.location.hostname}
            </div>
          </div>
          
          {configError && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start">
              <svg className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{configError}</span>
            </div>
          )}
          
          <div className="mb-8 flex justify-center">
            <div className="bg-gray-100 p-5 rounded-2xl inline-flex shadow-sm">
              <span className="text-gray-700 font-medium text-lg">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: 'long',
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          
          <form onSubmit={handleLogin} className="w-full">
            <div className="flex items-center mb-8 justify-center">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-14 h-7 rounded-full ${rememberMe ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform ${rememberMe ? 'transform translate-x-7' : ''}`}></div>
                </div>
                <span className="ml-4 text-gray-700 font-medium select-none text-lg">Ingat saya</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || redirectInProgressRef.current || !msalConfig}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] hover:from-[#b681ff] hover:to-[#7159d4] text-white font-bold text-lg shadow-lg transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengarahkan...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4ZM12 14C16.4 14 20 15.8 20 18V20H4V18C4 15.8 7.6 14 12 14Z" fill="currentColor"/>
                  </svg>
                  Login dengan Microsoft
                </>
              )}
            </button>
          </form>
          
          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-base">
              Butuh bantuan? Hubungi tim IT support
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Redirect URI: {msalConfig.auth.redirectUri}
            </p>
          </div>
        </div>
      </div>
      
      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.15; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
    </div>
  );
}