import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { AuthContext } from "../AppProvider";
import { useNavigate } from "react-router-dom";

/**
 * Login.jsx - Responsive & Enhanced Version
 * Optimized for mobile devices with improved UI/UX
 */

// ====== dev-only logger ======
const isDev =
  (typeof import.meta !== "undefined" && import.meta.env?.MODE === "development") ||
  process.env.NODE_ENV === "development";

const dev = {
  log: (...a) => isDev && console.log(...a),
  info: (...a) => isDev && console.info(...a),
  warn: (...a) => isDev && console.warn(...a),
  debug: (...a) => isDev && console.debug(...a),
};

export default function Login() {
  const { instance, accounts } = useMsal();
  const { rememberMe, setRememberMe } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [configError, setConfigError] = useState(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const navigatedRef = useRef(false);

  // ============== Detect mobile device ==============
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============== helper: fetch JSON dengan timeout & silent 404 ==============
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
        if (res.status !== 404) dev.debug(`[config] ${url} -> ${res.status} ${res.statusText}`);
        return null;
      }
      return await res.json().catch(() => null);
    } catch (e) {
      dev.debug(`[config] ${url} gagal: ${e?.name || "Error"} ${e?.message || e}`);
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

      const endpoints = [
        "/config.json",
        "/api/config",
        "/config",
        "http://localhost:3001/api/config",
        "http://localhost:3000/api/config",
      ];

      let found = null;
      for (const u of endpoints) {
        dev.debug("[config] mencoba:", u);
        const json = await fetchJsonSilent(u);
        if (json && typeof json === "object") {
          found = json;
          dev.info("[config] OK dari:", u);
          break;
        }
      }

      const normalized =
        found && Array.isArray(found.adminEmails)
          ? { adminEmails: found.adminEmails }
          : null;

      if (!mountedRef.current) return;

      if (normalized) {
        setAdminList(normalized.adminEmails.map((e) => String(e).toLowerCase()));
        setConfigError(null);
      } else {
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

  // =========================== auto-navigate ketika siap =======================
  useEffect(() => {
    if (navigatedRef.current) return;
    if (!configLoaded) return;
    if (!currentEmail) return;

    const isAdmin = adminList.includes(currentEmail);
    dev.log(`[route] email=${currentEmail} admin=${isAdmin}`);

    navigatedRef.current = true;
    navigate(isAdmin ? "/helpdesk/entry" : "/chat", { replace: true });
  }, [currentEmail, adminList, navigate, configLoaded]);

  // ================================= login ====================================
  const handleLogin = async (e) => {
    e.preventDefault();
    localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
    setLoading(true);
    try {
      // Untuk mobile, langsung pakai popup (biasanya lebih reliable)
      if (isMobile) {
        await instance.loginPopup();
      } else {
        // Desktop: coba silent login dulu
        try {
          await instance.ssoSilent({});
        } catch {
          await instance.loginPopup();
        }
      }
    } catch (error) {
      alert("Login gagal! Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  // =============================== UI states ==================================
  if (!configLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="text-center max-w-xs">
          {/* Mobile Optimized Loading */}
          <div className="relative mx-auto mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <svg className="animate-pulse h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-gray-700 font-medium text-sm md:text-base">Memuat konfigurasi sistem...</p>
          <p className="mt-2 text-xs md:text-sm text-gray-500">Harap tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-900 p-2 sm:p-4 relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      
      {/* Animated Floating Elements */}
      <div className="absolute top-10 left-10 w-4 h-4 bg-white rounded-full opacity-10 animate-float"></div>
      <div className="absolute top-1/3 right-20 w-3 h-3 bg-purple-300 rounded-full opacity-20 animate-float delay-1000"></div>
      <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-indigo-300 rounded-full opacity-30 animate-float delay-2000"></div>

      {/* Main Container */}
      <div className="max-w-6xl w-full flex flex-col lg:flex-row rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-sm border border-white/10 mx-2">
        
        {/* Left Panel - Company Info (Hidden on mobile, shown on tablet+) */}
        <div className="hidden md:flex md:w-2/5 bg-gradient-to-br from-[#7159d4] to-[#b681ff] text-white p-6 lg:p-8 xl:p-10 flex-col justify-between relative overflow-hidden">
          {/* Enhanced Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.2)_0%,transparent_50%)]"></div>
          
          <div className="relative z-10">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl font-bold mb-4 lg:mb-6 leading-tight">
              IT Asset Management
            </h1>
            <p className="text-purple-100 mb-4 lg:mb-6 text-sm lg:text-base xl:text-lg leading-relaxed">
              Sistem manajemen aset TI terintegrasi untuk PT Waskita Karya Infrastruktur
            </p>
            
            {/* Feature List */}
            <div className="space-y-3 lg:space-y-4 mt-6 lg:mt-8">
              {[
                "Akses terkontrol dan terjamin",
                "Manajemen aset yang efisien", 
                "Laporan real-time",
                "Interface responsif"
              ].map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-6 lg:w-8 h-0.5 bg-purple-300 mr-3 flex-shrink-0"></div>
                  <span className="text-purple-200 text-sm lg:text-base">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Company Logos */}
          <div className="relative z-10 mt-6 lg:mt-8">
            <div className="flex items-center justify-start space-x-4 lg:space-x-6 mb-4 lg:mb-6 flex-wrap">
              <img
                src="/Danantara-Indonesia-Logo-2025.png"
                alt="Danantara Indonesia Logo"
                className="h-12 lg:h-16 xl:h-20 w-auto object-contain opacity-95"
              />
              <img
                src="/logo-wki.png"
                alt="Waskita Infrastruktur Logo"
                className="h-10 lg:h-14 xl:h-16 w-auto object-contain opacity-95"
              />
            </div>
            <p className="text-xs lg:text-sm text-purple-200">
              &copy; {new Date().getFullYear()} PT Waskita Karya Infrastruktur
            </p>
          </div>
        </div>

        {/* Mobile Header (Shown only on mobile) */}
        {isMobile && (
          <div className="md:hidden bg-gradient-to-r from-[#7159d4] to-[#b681ff] text-white p-6 text-center">
            <h1 className="text-xl font-bold mb-2">IT Asset Management</h1>
            <p className="text-purple-100 text-sm">PT Waskita Karya Infrastruktur</p>
          </div>
        )}
        
        {/* Right Panel - Login Form */}
        <div className="w-full md:w-3/5 bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center relative">
          {/* Close button for mobile (if needed) */}
          {isMobile && (
            <button 
              onClick={() => window.history.back()}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <div className="text-center mb-6 lg:mb-8 xl:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2 lg:mb-3">
              {isMobile ? "Masuk" : "Masuk ke Sistem"}
            </h2>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
              Gunakan akun Microsoft Anda
            </p>
          </div>
          
          {/* Config Error Banner */}
          {configError && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-amber-50 border border-amber-200 rounded-lg lg:rounded-xl text-amber-800 text-xs lg:text-sm flex items-start">
              <svg className="w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{configError}</span>
            </div>
          )}
          
          {/* Date Display */}
          <div className="mb-6 lg:mb-8 flex justify-center">
            <div className="bg-gray-100 p-3 lg:p-4 rounded-xl lg:rounded-2xl inline-flex shadow-sm">
              <span className="text-gray-700 font-medium text-sm lg:text-base">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: isMobile ? 'short' : 'long',
                  day: "numeric",
                  month: isMobile ? 'short' : "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          
          {/* Login Form */}
          <form onSubmit={handleLogin} className="w-full max-w-sm mx-auto">
            {/* Remember Me Toggle */}
            <div className="flex items-center mb-6 lg:mb-8 justify-center">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`block w-12 lg:w-14 h-6 lg:h-7 rounded-full ${rememberMe ? 'bg-purple-600' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-0.5 lg:left-1 top-0.5 lg:top-1 bg-white w-5 h-5 rounded-full transition-transform ${rememberMe ? 'transform translate-x-6 lg:translate-x-7' : ''}`}></div>
                </div>
                <span className="ml-3 text-gray-700 font-medium select-none text-sm lg:text-base">Ingat saya</span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 lg:py-4 px-6 rounded-lg lg:rounded-xl bg-gradient-to-r from-[#7159d4] to-[#b681ff] hover:from-[#b681ff] hover:to-[#7159d4] text-white font-bold text-base lg:text-lg shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center relative overflow-hidden group"
            >
              {/* Animated background effect */}
              <span className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></span>
              
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 lg:mr-3 h-4 w-4 lg:h-5 lg:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm lg:text-base">Memproses...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 mr-2 lg:mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4C14.2 4 16 5.8 16 8C16 10.2 14.2 12 12 12C9.8 12 8 10.2 8 8C8 5.8 9.8 4 12 4ZM12 14C16.4 14 20 15.8 20 18V20H4V18C4 15.8 7.6 14 12 14Z" fill="currentColor"/>
                  </svg>
                  <span className="text-sm lg:text-base">Login dengan Microsoft</span>
                </>
              )}
            </button>
          </form>
          
          {/* Help Section */}
          <div className="mt-8 lg:mt-10 pt-4 lg:pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-xs lg:text-sm">
              Butuh bantuan? Hubungi tim IT
            </p>
            {/* Quick Contact for Mobile */}
            {isMobile && (
              <a 
                href="tel:+622150000000" 
                className="inline-block mt-2 text-purple-600 font-medium text-sm"
              >
                📞 Hubungi Sekarang
              </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Custom CSS */}
      <style>
        {`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.15; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(120deg); }
            66% { transform: translateY(5px) rotate(240deg); }
          }
          .animate-pulse-slow {
            animation: pulse-slow 6s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .dot {
            transition: transform 0.3s ease-in-out;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          /* Improved mobile responsiveness */
          @media (max-width: 640px) {
            .min-h-screen {
              align-items: flex-start;
              padding-top: 2rem;
            }
          }
          
          /* Better touch targets for mobile */
          @media (max-width: 768px) {
            button, [role="button"] {
              min-height: 44px;
            }
          }
        `}
      </style>
    </div>
  );
}