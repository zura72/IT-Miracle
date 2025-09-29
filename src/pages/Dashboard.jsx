// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate } from "react-router-dom";
import { 
  FaDesktop, 
  FaPlug, 
  FaIdBadge, 
  FaBell, 
  FaListUl,
  FaChartPie,
  FaExclamationTriangle,
  FaTools,
  FaBoxOpen,
  FaSync,
  FaChevronRight,
  FaUsers,
  FaDatabase,
  FaShieldAlt
} from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

// Mapping warna untuk status device
const statusMap = {
  "DIPAKAI": { color: "#10b981", label: "Dipakai", icon: "🟢" },
  "SPARE": { color: "#f59e0b", label: "Spare", icon: "🟡" },
  "RUSAK": { color: "#ef4444", label: "Rusak", icon: "🔴" },
  "HILANG": { color: "#8b5cf6", label: "Hilang", icon: "🟣" },
  "TERSEDIA": { color: "#3b82f6", label: "Tersedia", icon: "🔵" },
  "PERBAIKAN": { color: "#f97316", label: "Perbaikan", icon: "🟠" },
  "(KOSONG)": { color: "#9ca3af", label: "Unknown", icon: "⚫" }
};

const defaultStatusColor = "#d1d5db";

// Config
const deviceSiteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const deviceListId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const peripheralSiteId = "waskitainfra.sharepoint.com,82f98496-0de9-45f8-9b3e-30bbfd2838fe,a097be9c-086d-41bd-9afb-5b1a095f2705";
const peripheralListId = "dae749d2-2fd1-4a05-bd16-a69194eb0341";
const GRAPH_SCOPE = ["Sites.Read.All", "Directory.Read.All"];

// GlassCard Component dengan animasi enhanced
const GlassCard = ({ children, className = '', darkMode, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 30, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
    whileHover={{ y: -5, scale: 1.02 }}
    className={`rounded-2xl backdrop-blur-lg border border-opacity-20 
      ${darkMode 
        ? 'bg-gray-800/70 border-gray-600 shadow-2xl shadow-black/30' 
        : 'bg-white/80 border-gray-300 shadow-2xl shadow-blue-100'
      } 
      transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

export default function Dashboard() {
  const { dark: darkMode } = useTheme();
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();

  const [deviceData, setDeviceData] = useState([]);
  const [peripheralData, setPeripheralData] = useState([]);
  const [licenseData, setLicenseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalDevices: 0,
    totalPeripherals: 0,
    totalLicenses: 0,
    devicesNeedingRepair: 0,
    zeroStockItems: 0,
    licenseWarnings: 0,
    activeUsers: 0,
    systemHealth: 95
  });

  // State untuk efek partikel
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (accounts.length) fetchAll();
    // eslint-disable-next-line
  }, [accounts.length]);

  // Efek partikel background
  useEffect(() => {
    const newParticles = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5
    }));
    setParticles(newParticles);
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const account = accounts[0];
      const tokenResp = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account
      });
      const token = tokenResp.accessToken;

      let devRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${deviceSiteId}/lists/${deviceListId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let devJson = await devRes.json();
      setDeviceData(Array.isArray(devJson.value) ? devJson.value : []);

      let perRes = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${peripheralSiteId}/lists/${peripheralListId}/items?expand=fields`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let perJson = await perRes.json();
      setPeripheralData(Array.isArray(perJson.value) ? perJson.value : []);

      let licRes = await fetch(
        `https://graph.microsoft.com/v1.0/subscribedSkus`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let licJson = await licRes.json();
      setLicenseData(Array.isArray(licJson.value) ? licJson.value : []);

    } catch (err) {
      console.error("Gagal load dashboard: ", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  useEffect(() => {
    // Calculate statistics
    const statusGroups = {};
    deviceData.forEach(d => {
      const s = (d.fields?.Status || "(KOSONG)").toUpperCase();
      if (!statusGroups[s]) statusGroups[s] = [];
      statusGroups[s].push(d);
    });

    const zeroStockPeripheral = peripheralData.filter(d => (d.fields?.field_2 ?? 1) <= 0);
    const licenseWarning = licenseData.filter(l => l.prepaidUnits?.warning > 0);
    const devicesNeedingRepair = statusGroups["PERBAIKAN"]?.length || 0;

    setStats({
      totalDevices: deviceData.length,
      totalPeripherals: peripheralData.length,
      totalLicenses: licenseData.length,
      devicesNeedingRepair,
      zeroStockItems: zeroStockPeripheral.length,
      licenseWarnings: licenseWarning.length,
      activeUsers: Math.floor(Math.random() * 50) + 150, // Simulasi data user
      systemHealth: 95 - (devicesNeedingRepair * 2 + zeroStockPeripheral.length * 1)
    });
  }, [deviceData, peripheralData, licenseData]);

  // ---- Devices multi status ----
  const statusGroups = {};
  deviceData.forEach(d => {
    const s = (d.fields?.Status || "(KOSONG)").toUpperCase();
    if (!statusGroups[s]) statusGroups[s] = [];
    statusGroups[s].push(d);
  });
  const allStatusKeys = Object.keys(statusGroups);

  // ---- Peripheral ----
  const totalPeripheral = peripheralData.length;
  const zeroStockPeripheral = peripheralData.filter(d => (d.fields?.field_2 ?? 1) <= 0);

  // ---- License ----
  const totalLicense = licenseData.length;
  const licenseWarning = licenseData.filter(l => l.prepaidUnits?.warning > 0);

  // ---- Pie chart data ----
  const pieData = allStatusKeys.map(st => ({
    key: st,
    name: statusMap[st]?.label || st,
    value: statusGroups[st].length,
    color: statusMap[st]?.color || defaultStatusColor,
    icon: statusMap[st]?.icon || "⚫"
  }));

  // ---- Notifikasi ----
  const notifPerluPerbaikan = statusGroups["PERBAIKAN"]?.map(d => d.fields.Title).join(", ") || "";
  const notifPeripheralHabis = zeroStockPeripheral.map(p => p.fields.Title).join(", ");
  const notifLicenseWarning = licenseWarning.map(l => l.skuPartNumber + " (" + l.prepaidUnits.warning + ")").join(", ");

  // ---- Aktivitas terakhir ----
  function getLatestActivity() {
    let activities = [
      ...deviceData.map(d => ({
        waktu: d.fields?.Modified,
        text: "Update device " + (d.fields?.Title || ""),
        type: "device"
      })),
      ...peripheralData.map(d => ({
        waktu: d.fields?.Modified,
        text: "Update peripheral " + (d.fields?.Title || ""),
        type: "peripheral"
      }))
    ];
    return activities
      .filter(a => a.waktu)
      .sort((a, b) => new Date(b.waktu) - new Date(a.waktu))
      .slice(0, 5);
  }
  const latestActivities = getLatestActivity();

  // Loading state dengan animasi enhanced
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-gray-100'}`}>
        <div className="text-center">
          <motion.div
            animate={{ 
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, repeat: Infinity, repeatType: "reverse", duration: 1.5 }}
            className="text-gray-600 dark:text-gray-300 text-lg font-medium"
          >
            Memuat dashboard...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 overflow-hidden relative ${darkMode ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 via-white to-gray-100 text-gray-900'} px-4 py-6`}>
      
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className={`absolute rounded-full ${darkMode ? 'bg-blue-500/20' : 'bg-blue-400/30'}`}
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Enhanced Header dengan animasi */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, duration: 0.8 }}
        className="relative z-10 mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              IT Asset Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Manajemen aset TI terintegrasi • {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </motion.p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-3 rounded-full backdrop-blur-lg border transition-all duration-300 ${
              darkMode 
                ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50' 
                : 'bg-white/50 border-gray-300 hover:bg-white/70'
            } shadow-lg`}
          >
            <motion.div
              animate={{ rotate: refreshing ? 360 : 0 }}
              transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
            >
              <FaSync className={refreshing ? "text-blue-500" : darkMode ? "text-gray-300" : "text-gray-600"} size={18} />
            </motion.div>
          </motion.button>
        </div>
      </motion.div>

      <div className="relative z-10">
        
        {/* Overview Cards dengan animasi bertahap */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8"
        >
          {[
            { 
              title: "Devices", 
              value: stats.totalDevices, 
              icon: <FaDesktop className="text-blue-500" size={16} />,
              color: "blue",
              trend: "up",
              description: "Total perangkat"
            },
            { 
              title: "Peripheral", 
              value: stats.totalPeripherals, 
              icon: <FaPlug className="text-green-500" size={16} />,
              color: "green",
              trend: "stable",
              description: "Perangkat tambahan"
            },
            { 
              title: "Licenses", 
              value: stats.totalLicenses, 
              icon: <FaIdBadge className="text-purple-500" size={16} />,
              color: "purple",
              trend: "down",
              description: "Lisensi aktif"
            },
            { 
              title: "Active Users", 
              value: stats.activeUsers, 
              icon: <FaUsers className="text-cyan-500" size={16} />,
              color: "cyan",
              trend: "up",
              description: "Pengguna aktif"
            },
            { 
              title: "Perbaikan", 
              value: stats.devicesNeedingRepair, 
              icon: <FaTools className="text-orange-500" size={16} />,
              color: "orange",
              trend: "warning",
              description: "Butuh perbaikan"
            },
            { 
              title: "Stok Habis", 
              value: stats.zeroStockItems, 
              icon: <FaBoxOpen className="text-red-500" size={16} />,
              color: "red",
              trend: "danger",
              description: "Stok kosong"
            },
            { 
              title: "License Alert", 
              value: stats.licenseWarnings, 
              icon: <FaExclamationTriangle className="text-yellow-500" size={16} />,
              color: "yellow",
              trend: "warning",
              description: "Peringatan lisensi"
            },
            { 
              title: "System Health", 
              value: `${stats.systemHealth}%`, 
              icon: <FaShieldAlt className="text-emerald-500" size={16} />,
              color: "emerald",
              trend: "stable",
              description: "Kesehatan sistem"
            }
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7 + (index * 0.1), type: "spring", stiffness: 100 }}
            >
              <OverviewCard 
                {...item}
                darkMode={darkMode}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Column - Chart & Activity */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Device Status Chart dengan animasi */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2, type: "spring" }}
            >
              <GlassCard darkMode={darkMode} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <FaChartPie className="mr-3 text-blue-500" size={20} />
                    </motion.div>
                    Status Perangkat
                  </h2>
                  <motion.span 
                    whileHover={{ scale: 1.1 }}
                    className="px-3 py-1 rounded-full text-sm bg-blue-500 text-white font-medium"
                  >
                    {deviceData.length} devices
                  </motion.span>
                </div>
                
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                  {/* Enhanced Pie Chart */}
                  <div className="flex-shrink-0">
                    <PieChart pieData={pieData} size={200} />
                  </div>
                  
                  {/* Status Legend */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pieData.map((s, index) => (
                      <motion.div 
                        key={s.key} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.4 + (index * 0.1) }}
                        whileHover={{ scale: 1.05, x: 5 }}
                        className="flex items-center p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 cursor-pointer group"
                      >
                        <span className="text-2xl mr-4 group-hover:scale-110 transition-transform">{s.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</p>
                            <span className="text-lg font-bold" style={{ color: s.color }}>
                              {s.value}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-2">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(s.value / deviceData.length) * 100}%` }}
                              transition={{ delay: 1.6 + (index * 0.1), duration: 1 }}
                              className="h-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {Math.round((s.value / deviceData.length) * 100)}% dari total
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Recent Activity dengan animasi */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4, type: "spring" }}
            >
              <GlassCard darkMode={darkMode} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                    >
                      <FaListUl className="text-blue-500" size={20} />
                    </motion.div>
                    <h2 className="text-xl font-bold">Aktivitas Terakhir</h2>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-blue-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Lihat Semua
                  </motion.button>
                </div>
                
                <div className="space-y-4">
                  {latestActivities.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <div className="text-6xl mb-4">📊</div>
                      <p className="text-gray-500 dark:text-gray-400">Belum ada aktivitas</p>
                    </motion.div>
                  ) : (
                    <AnimatePresence>
                      {latestActivities.map((act, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 1.6 + (i * 0.1) }}
                          exit={{ opacity: 0, x: -50 }}
                          whileHover={{ x: 5, backgroundColor: darkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)' }}
                          className="flex items-center p-4 rounded-xl transition-all duration-300 group cursor-pointer"
                        >
                          <motion.div 
                            whileHover={{ scale: 1.2 }}
                            className={`w-3 h-3 rounded-full mr-4 ${
                              act.type === 'device' ? 'bg-blue-500' : 'bg-green-500'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {act.text}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {act.waktu ? new Date(act.waktu).toLocaleString("id-ID", {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "Waktu tidak tersedia"}
                            </p>
                          </div>
                          <motion.div
                            whileHover={{ x: 5 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          >
                            <FaChevronRight className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                          </motion.div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Right Column - Notifications & Quick Actions */}
          <div className="space-y-6">
            
            {/* Notifications dengan animasi */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.6, type: "spring" }}
            >
              <GlassCard darkMode={darkMode} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatDelay: 5
                      }}
                    >
                      <FaBell className="text-yellow-500" size={20} />
                    </motion.div>
                    <h2 className="text-xl font-bold">Notifikasi</h2>
                    {(notifPerluPerbaikan || notifLicenseWarning || notifPeripheralHabis) && (
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold"
                      >
                        {[notifPerluPerbaikan, notifLicenseWarning, notifPeripheralHabis].filter(Boolean).length}
                      </motion.span>
                    )}
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-blue-500 font-medium hover:text-blue-600 transition-colors"
                  >
                    Clear All
                  </motion.button>
                </div>
                
                <div className="space-y-4">
                  {notifPerluPerbaikan && (
                    <NotificationItem 
                      type="warning"
                      title="⚠️ Perlu Perbaikan"
                      content={notifPerluPerbaikan}
                      darkMode={darkMode}
                      time="Baru saja"
                    />
                  )}
                  
                  {notifLicenseWarning && (
                    <NotificationItem 
                      type="danger"
                      title="🔴 License Warning"
                      content={notifLicenseWarning}
                      darkMode={darkMode}
                      time="1 jam lalu"
                    />
                  )}
                  
                  {notifPeripheralHabis && (
                    <NotificationItem 
                      type="info"
                      title="🔵 Stok Habis"
                      content={notifPeripheralHabis}
                      darkMode={darkMode}
                      time="2 jam lalu"
                    />
                  )}
                  
                  {!notifPerluPerbaikan && !notifLicenseWarning && !notifPeripheralHabis && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <motion.div 
                        animate={{ 
                          y: [0, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 3, 
                          repeat: Infinity,
                          ease: "easeInOut" 
                        }}
                        className="text-6xl mb-4"
                      >
                        🎉
                      </motion.div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Tidak ada notifikasi</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Semua sistem berjalan normal</p>
                    </motion.div>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            {/* Quick Actions dengan animasi */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.8, type: "spring" }}
            >
              <GlassCard darkMode={darkMode} className="p-6">
                <h2 className="text-xl font-bold mb-6">Akses Cepat</h2>
                <div className="grid grid-cols-2 gap-4">
                  <QuickActionButton 
                    title="Devices"
                    icon={<FaDesktop size={20} />}
                    onClick={() => navigate("/devices")}
                    color="blue"
                    darkMode={darkMode}
                    subtitle="Manage devices"
                  />
                  <QuickActionButton 
                    title="Peripheral"
                    icon={<FaPlug size={20} />}
                    onClick={() => navigate("/peripheral")}
                    color="green"
                    darkMode={darkMode}
                    subtitle="Stock management"
                  />
                  <QuickActionButton 
                    title="Licenses"
                    icon={<FaIdBadge size={20} />}
                    onClick={() => navigate("/licenses")}
                    color="purple"
                    darkMode={darkMode}
                    subtitle="License overview"
                  />
                  <QuickActionButton 
                    title="Helpdesk"
                    icon={<FaTools size={20} />}
                    onClick={() => navigate("/helpdesk/entry")}
                    color="orange"
                    darkMode={darkMode}
                    subtitle="Support tickets"
                  />
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Overview Card Component dengan animasi floating
function OverviewCard({ title, value, icon, color, darkMode, trend, description }) {
  const colorClasses = {
    blue: { 
      gradient: 'from-blue-500 to-blue-600',
      glow: 'shadow-blue-500/25'
    },
    green: { 
      gradient: 'from-green-500 to-green-600',
      glow: 'shadow-green-500/25'
    },
    purple: { 
      gradient: 'from-purple-500 to-purple-600',
      glow: 'shadow-purple-500/25'
    },
    orange: { 
      gradient: 'from-orange-500 to-orange-600',
      glow: 'shadow-orange-500/25'
    },
    red: { 
      gradient: 'from-red-500 to-red-600',
      glow: 'shadow-red-500/25'
    },
    yellow: { 
      gradient: 'from-yellow-500 to-yellow-600',
      glow: 'shadow-yellow-500/25'
    },
    cyan: { 
      gradient: 'from-cyan-500 to-cyan-600',
      glow: 'shadow-cyan-500/25'
    },
    emerald: { 
      gradient: 'from-emerald-500 to-emerald-600',
      glow: 'shadow-emerald-500/25'
    }
  };

  const trendIcons = {
    up: "↗️",
    down: "↘️",
    stable: "→",
    warning: "⚠️",
    danger: "🔴"
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-4 rounded-2xl backdrop-blur-lg border transition-all duration-300 overflow-hidden group cursor-pointer ${
        darkMode 
          ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50' 
          : 'bg-white/50 border-gray-300 hover:bg-white/70'
      } shadow-lg hover:shadow-xl ${colorClasses[color].glow}`}
    >
      {/* Animated Background Gradient */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color].gradient} opacity-0 group-hover:opacity-5`}
        transition={{ duration: 0.3 }}
      />
      
      {/* Floating particles effect */}
      <motion.div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        initial={false}
      >
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className={`absolute w-1 h-1 rounded-full ${colorClasses[color].glow.replace('shadow-', 'bg-').replace('/25', '')}`}
            style={{
              left: `${20 + i * 20}%`,
              top: '20%',
            }}
            animate={{
              y: [0, -10, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              delay: i * 0.3,
              repeat: Infinity,
            }}
          />
        ))}
      </motion.div>

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className={`p-2 rounded-xl bg-gradient-to-r ${colorClasses[color].gradient} shadow-lg`}
          >
            {icon}
          </motion.div>
          <motion.span 
            className="text-xs px-2 py-1 rounded-full bg-black/10 dark:bg-white/10"
            whileHover={{ scale: 1.1 }}
          >
            {trendIcons[trend]}
          </motion.span>
        </div>
        
        <div>
          <p className={`text-sm font-semibold mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {title}
          </p>
          <motion.p 
            className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[color].gradient} bg-clip-text text-transparent`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Enhanced Notification Item Component dengan animasi
function NotificationItem({ type, title, content, darkMode, time }) {
  const typeStyles = {
    warning: {
      icon: '🟠',
      bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      border: darkMode ? 'border-orange-700' : 'border-orange-200',
      text: darkMode ? 'text-orange-300' : 'text-orange-800',
      gradient: 'from-orange-500 to-orange-600'
    },
    danger: {
      icon: '🔴',
      bg: darkMode ? 'bg-red-900/20' : 'bg-red-50',
      border: darkMode ? 'border-red-700' : 'border-red-200',
      text: darkMode ? 'text-red-300' : 'text-red-800',
      gradient: 'from-red-500 to-red-600'
    },
    info: {
      icon: '🔵',
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: darkMode ? 'border-blue-700' : 'border-blue-200',
      text: darkMode ? 'text-blue-300' : 'text-blue-800',
      gradient: 'from-blue-500 to-blue-600'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-4 rounded-xl border-2 ${typeStyles[type].bg} ${typeStyles[type].border} relative overflow-hidden group cursor-pointer`}
    >
      {/* Animated background gradient on hover */}
      <motion.div 
        className={`absolute inset-0 bg-gradient-to-r ${typeStyles[type].gradient} opacity-0 group-hover:opacity-5`}
        transition={{ duration: 0.3 }}
      />
      
      <div className="flex items-start relative z-10">
        <motion.span 
          className="text-2xl mr-4"
          whileHover={{ scale: 1.2, rotate: 10 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {typeStyles[type].icon}
        </motion.span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <motion.p 
              className={`font-bold text-sm ${typeStyles[type].text}`}
              whileHover={{ x: 2 }}
            >
              {title}
            </motion.p>
            <span className="text-xs text-gray-500 bg-black/10 dark:bg-white/10 px-2 py-1 rounded-full">
              {time}
            </span>
          </div>
          <motion.p 
            className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {content}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}

// Enhanced Quick Action Button Component dengan animasi magnetic
function QuickActionButton({ title, icon, onClick, color, darkMode, subtitle }) {
  const colorClasses = {
    blue: { 
      gradient: 'from-blue-500 to-blue-600',
      hover: 'hover:from-blue-600 hover:to-blue-700'
    },
    green: { 
      gradient: 'from-green-500 to-green-600',
      hover: 'hover:from-green-600 hover:to-green-700'
    },
    purple: { 
      gradient: 'from-purple-500 to-purple-600',
      hover: 'hover:from-purple-600 hover:to-purple-700'
    },
    orange: { 
      gradient: 'from-orange-500 to-orange-600',
      hover: 'hover:from-orange-600 hover:to-orange-700'
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -3 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-4 rounded-xl text-white bg-gradient-to-r ${colorClasses[color].gradient} ${colorClasses[color].hover} shadow-lg transition-all duration-300 flex flex-col items-center justify-center relative overflow-hidden group`}
    >
      {/* Animated shine effect */}
      <motion.div 
        className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700"
        initial={false}
      />
      
      {/* Floating icon */}
      <motion.div 
        className="text-3xl mb-3 relative z-10"
        whileHover={{ 
          y: -5,
          transition: { type: "spring", stiffness: 400 }
        }}
      >
        {icon}
      </motion.div>
      
      {/* Text content */}
      <div className="relative z-10 text-center">
        <span className="font-semibold text-sm block">{title}</span>
        {subtitle && (
          <motion.span 
            className="text-xs opacity-90 mt-1 block"
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
          >
            {subtitle}
          </motion.span>
        )}
      </div>

      {/* Particle effects */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
        {[1, 2, 3].map(i => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${10 + i * 25}%`,
              bottom: '10%',
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 1.5,
              delay: i * 0.2,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
    </motion.button>
  );
}

// Enhanced Pie Chart Component dengan animasi segment
function PieChart({ pieData, size = 200 }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const total = pieData.reduce((sum, s) => sum + s.value, 0) || 1;
  let cumulative = 0;
  const radius = size * 0.4, cx = size / 2, cy = size / 2;
  
  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {pieData.map((s, i) => {
          if (s.value === 0) return null;
          
          const val = s.value / total;
          const start = cumulative;
          const end = cumulative + val;
          cumulative = end;
          
          const x1 = cx + radius * Math.cos(2 * Math.PI * start - Math.PI / 2);
          const y1 = cy + radius * Math.sin(2 * Math.PI * start - Math.PI / 2);
          const x2 = cx + radius * Math.cos(2 * Math.PI * end - Math.PI / 2);
          const y2 = cy + radius * Math.sin(2 * Math.PI * end - Math.PI / 2);
          
          const largeArc = val > 0.5 ? 1 : 0;
          const d = `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
          
          return (
            <motion.path 
              key={i} 
              d={d} 
              fill={s.color} 
              stroke="#fff" 
              strokeWidth={3}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.8 + (i * 0.1), type: "spring", stiffness: 100 }}
              className="cursor-pointer"
              style={{ 
                opacity: activeIndex === null || activeIndex === i ? 1 : 0.7,
                filter: activeIndex === i ? `drop-shadow(0 0 8px ${s.color})` : 'none'
              }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              whileHover={{ scale: 1.05 }}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={2} />
        <text 
          x={cx} 
          y={cy} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize={size * 0.15} 
          fontWeight="bold" 
          fill="currentColor"
          className="text-gray-700 dark:text-gray-300"
        >
          {total}
        </text>
      </svg>
      
      {/* Enhanced Tooltip dengan animasi */}
      {activeIndex !== null && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="absolute bg-gray-900 text-white p-3 rounded-xl text-sm shadow-2xl z-10 min-w-[120px]"
          style={{ 
            top: '50%', 
            left: size + 20,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="font-bold mb-1">{pieData[activeIndex].name}</div>
          <div className="flex items-center justify-between">
            <span>{pieData[activeIndex].value} devices</span>
            <span className="ml-2 px-2 py-1 bg-white/20 rounded-full text-xs">
              {Math.round((pieData[activeIndex].value / total) * 100)}%
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}