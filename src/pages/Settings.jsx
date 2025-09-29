import React, { useContext, useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AppProvider";
import { 
  FiMail, 
  FiLogOut, 
  FiUser, 
  FiSettings, 
  FiBell,
  FiShield,
  FiDatabase,
  FiHelpCircle,
  FiGlobe,
  FiKey,
  FiEye,
  FiEyeOff,
  FiCopy,
  FiCheck,
  FiStar,
  FiAward,
  FiMenu,
  FiX,
  FiChevronRight
} from "react-icons/fi";

export default function Settings() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const { isAdminLoggedIn, adminEmail, logoutAdmin, dark } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("account");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Deteksi ukuran layar
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Data profil user
  let initials = "US", email = "user@email.com", name = "Master";
  if (accounts && accounts.length > 0) {
    initials = accounts[0]?.username?.slice(0, 2).toUpperCase()
      || accounts[0]?.name?.split(" ").map(n => n[0]).join("").toUpperCase() || "US";
    email = accounts[0]?.username || "user@email.com";
    name = accounts[0]?.name || "Microsoft User";
  } else if (isAdminLoggedIn) {
    initials = adminEmail.slice(0, 2).toUpperCase();
    email = adminEmail;
    name = "Master";
  }

  // Logout
  const handleLogout = () => {
    if (accounts && accounts.length > 0) {
      instance.logoutPopup().then(() => {
        navigate("/login", { replace: true });
        window.location.reload();
      });
    } else if (isAdminLoggedIn) {
      logoutAdmin();
      navigate("/login", { replace: true });
      window.location.reload();
    }
  };

  // Copy API Key
  const copyApiKey = () => {
    navigator.clipboard.writeText("wk1_4p1k3y_5ecur1ty");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Navigasi tab untuk mobile
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // Menu items
  const menuItems = [
    { id: "account", label: "Akun Saya", icon: <FiUser /> },
    { id: "preferences", label: "Preferensi", icon: <FiSettings /> },
    { id: "security", label: "Keamanan", icon: <FiShield /> },
    { id: "support", label: "Bantuan", icon: <FiHelpCircle /> },
  ];

  // Tab konten
  const renderTabContent = () => {
    switch(activeTab) {
      case "account":
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col items-center gap-3 mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#7e57c2] to-[#5e35b1] rounded-full flex items-center justify-center shadow-lg mb-2 border-4 border-white dark:border-gray-900">
                  <span className="text-2xl md:text-3xl text-white font-bold tracking-widest select-none">{initials}</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-[#ff6b6b] to-[#ff9e7d] rounded-full p-1.5 border-2 border-white dark:border-gray-900">
                  <FiAward className="text-white text-xs" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{name}</h2>
                <div className="mt-1 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white text-xs font-medium px-3 py-1 rounded-full inline-flex items-center">
                  <FiStar className="mr-1" size={12} />
                  Master Account
                </div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <FiMail className="inline text-base" />
                {email}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiUser className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Role</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Master Administrator
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white text-xs font-medium rounded-full">
                  Full Access
                </span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiDatabase className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Status Akun</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktif dan Terverifikasi</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm text-green-500">Online</span>
                </div>
              </div>
              
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-full">
                      <FiKey className="text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white">API Key</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gunakan untuk integrasi sistem
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-500 hover:text-purple-500 transition-colors p-1 rounded"
                  >
                    {showApiKey ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-3 font-mono text-sm text-gray-800 dark:text-white break-all">
                    {showApiKey ? "wk1_4p1k3y_5ecur1ty" : "••••••••••••••••••••••"}
                  </div>
                  <button 
                    onClick={copyApiKey}
                    className="p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                    title="Salin API Key"
                  >
                    {copied ? <FiCheck className="text-green-500" /> : <FiCopy />}
                  </button>
                </div>
                
                <button className="text-sm text-blue-500 hover:text-blue-700 font-medium transition-colors">
                  Regenerate Key
                </button>
              </div>
            </div>
          </div>
        );
      
      case "preferences":
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Preferensi Aplikasi</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiBell className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Notifikasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Email & push notification
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiGlobe className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Bahasa</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Pilih bahasa preferensi
                    </p>
                  </div>
                </div>
                <select className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg px-3 py-2 sm:py-1.5 w-full sm:w-auto">
                  <option>Indonesia</option>
                  <option>English</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiSettings className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Tampilan Antarmuka</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Pilih tema antarmuka
                    </p>
                  </div>
                </div>
                <select className="text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded-lg px-3 py-2 sm:py-1.5 w-full sm:w-auto">
                  <option>Default</option>
                  <option>Modern</option>
                  <option>Classic</option>
                </select>
              </div>
            </div>
          </div>
        );
      
      case "security":
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Keamanan & Privasi</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-500/10 rounded-full">
                    <FiShield className="text-red-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Autentikasi Dua Faktor</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tambahkan lapisan keamanan ekstra
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Aktifkan 2FA
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiKey className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Sesi Aktif</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      1 perangkat aktif
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-blue-500/10 text-blue-500 rounded-lg font-medium hover:bg-blue-500/20 transition-colors">
                  Kelola Sesi
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiDatabase className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Data & Privasi</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Kelola data pribadi Anda
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button className="flex-1 py-2.5 bg-purple-500/10 text-purple-500 rounded-lg font-medium hover:bg-purple-500/20 transition-colors">
                    Unduh Data
                  </button>
                  <button className="flex-1 py-2.5 bg-gray-500/10 text-gray-500 rounded-lg font-medium hover:bg-gray-500/20 transition-colors">
                    Hapus Akun
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "support":
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Bantuan & Dukungan</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-full">
                    <FiHelpCircle className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Pusat Bantuan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Temukan jawaban untuk pertanyaan umum
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
                  Kunjungi Pusat Bantuan
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/10 rounded-full">
                    <FiMail className="text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Hubungi Dukungan</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tim kami siap membantu 24/7
                    </p>
                  </div>
                </div>
                <button className="w-full py-2.5 bg-green-500/10 text-green-500 rounded-lg font-medium hover:bg-green-500/20 transition-colors">
                  Kirim Tiket Dukungan
                </button>
              </div>
              
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-full">
                    <FiSettings className="text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">Informasi Aplikasi</p>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                      <p>Versi: <span className="font-medium text-gray-800 dark:text-white">1.0.0</span></p>
                      <p>Build: <span className="font-medium text-gray-800 dark:text-white">{new Date().toISOString().split("T")[0]}</span></p>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                  Support:
                  <a
                    href="mailto:wiqolby@gmail.com"
                    className="ml-1 text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    wiqolby@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Pengaturan</h3>
            <p className="text-gray-500 dark:text-gray-400">Pilih menu pengaturan di sebelah kiri.</p>
          </div>
        );
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-4 px-2 sm:px-4">
      {/* Background Gradient Modern */}
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      
      {/* Efek Background Tambahan */}
      <div className="fixed inset-0 z-0 opacity-40">
        <div className="absolute top-1/4 left-1/4 w-48 h-48 md:w-72 md:h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 md:w-72 md:h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 md:w-72 md:h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content Card */}
      <div className="relative z-10 w-full max-w-6xl mx-auto">
        {/* Mobile Header */}
        {isMobile && (
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-xl rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  {isMobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
                </button>
                <div>
                  <h1 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FiSettings className="text-[#7e57c2]" />
                    Pengaturan
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {menuItems.find(item => item.id === activeTab)?.label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#7e57c2] to-[#5e35b1] rounded-full flex items-center justify-center">
                  <span className="text-sm text-white font-bold">{initials}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* Sidebar Navigasi - Desktop */}
          {!isMobile && (
            <div className="md:w-1/4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-xl rounded-2xl p-4 md:p-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <FiSettings className="text-[#7e57c2] dark:text-[#b681ff]" />
                Pengaturan
              </h2>
              
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
                      activeTab === item.id
                        ? "bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white shadow-md"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    <FiChevronRight className={`transition-transform ${
                      activeTab === item.id ? 'rotate-90' : 'group-hover:translate-x-1'
                    }`} />
                  </button>
                ))}
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-6 border border-red-200 dark:border-red-800"
                >
                  <FiLogOut />
                  Keluar
                </button>
              </nav>
            </div>
          )}

          {/* Mobile Sidebar Navigation */}
          {isMobile && isMobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="absolute left-0 top-0 h-full w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-r border-gray-200/60 dark:border-gray-700/60 shadow-2xl transform transition-transform">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <FiSettings className="text-[#7e57c2]" />
                    Pengaturan
                  </h2>
                </div>
                
                <nav className="p-4 space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all group ${
                        activeTab === item.id
                          ? "bg-gradient-to-r from-[#7e57c2] to-[#5e35b1] text-white shadow-md"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </div>
                      <FiChevronRight className={`transition-transform ${
                        activeTab === item.id ? 'rotate-90' : 'group-hover:translate-x-1'
                      }`} />
                    </button>
                  ))}
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-6 border border-red-200 dark:border-red-800"
                  >
                    <FiLogOut />
                    Keluar
                  </button>
                </nav>
              </div>
            </div>
          )}

          {/* Konten Utama */}
          <div className={`${isMobile ? 'w-full' : 'md:w-3/4'} bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/60 shadow-xl rounded-2xl p-4 md:p-6 min-h-[500px]`}>
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Floating Action Button untuk Mobile */}
      {isMobile && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleLogout}
            className="p-4 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
          >
            <FiLogOut size={20} />
          </button>
        </div>
      )}

      {/* Tambahkan style untuk animasi */}
      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}