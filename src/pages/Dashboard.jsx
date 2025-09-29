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
  FaBars,
  FaSearch
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

// GlassCard Component
const GlassCard = ({ children, className = '', darkMode }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl backdrop-blur-lg border border-opacity-20 
      ${darkMode 
        ? 'bg-gray-800/70 border-gray-600' 
        : 'bg-white/80 border-gray-300'
      } 
      shadow-xl ${className}`}
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
    licenseWarnings: 0
  });

  // State untuk mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (accounts.length) fetchAll();
    // eslint-disable-next-line
  }, [accounts.length]);

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
      licenseWarnings: licenseWarning.length
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

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"
          ></motion.div>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-gray-600 dark:text-gray-300"
          >
            Memuat data...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 to-gray-800 text-white' : 'bg-gradient-to-br from-blue-50 to-gray-100 text-gray-900'} px-2 sm:px-4 py-4`}>
      
      {/* Enhanced Mobile Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`sticky top-0 z-40 px-3 py-3 rounded-xl mb-4 ${darkMode ? 'bg-gray-800' : 'bg-blue-600 text-white'} shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/10"
            >
              <FaBars size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold">IT Asset Dashboard</h1>
              <p className="text-xs opacity-80 hidden sm:block">Manajemen aset TI terintegrasi</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-white/20'} transition-colors`}
            >
              <motion.div
                animate={{ rotate: refreshing ? 360 : 0 }}
                transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: "linear" }}
              >
                <FaSync className={refreshing ? "text-blue-400" : darkMode ? "text-gray-300" : "text-white"} size={14} />
              </motion.div>
            </motion.button>
            
            <div className={`px-2 py-1 rounded-full text-xs ${darkMode ? 'bg-gray-700' : 'bg-white/20'}`}>
              {new Date().toLocaleDateString('id-ID', { 
                day: 'numeric', 
                month: 'short'
              })}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex space-x-1 mt-3 overflow-x-auto pb-1">
          {["overview", "devices", "peripheral", "licenses"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? darkMode 
                    ? 'bg-white text-blue-600' 
                    : 'bg-white text-blue-600'
                  : darkMode 
                    ? 'bg-gray-700/50 text-gray-300' 
                    : 'bg-white/20 text-white'
              }`}
            >
              {tab === "overview" && "Overview"}
              {tab === "devices" && "Devices"}
              {tab === "peripheral" && "Peripheral"}
              {tab === "licenses" && "Licenses"}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="container mx-auto px-1 sm:px-2 py-2">
        
        {/* Overview Cards - Enhanced for Mobile */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4 sm:mb-6"
        >
          <OverviewCard 
            title="Devices" 
            value={stats.totalDevices} 
            icon={<FaDesktop className="text-blue-500" size={14} />}
            color="blue"
            darkMode={darkMode}
            trend="up"
          />
          <OverviewCard 
            title="Peripheral" 
            value={stats.totalPeripherals} 
            icon={<FaPlug className="text-green-500" size={14} />}
            color="green"
            darkMode={darkMode}
            trend="stable"
          />
          <OverviewCard 
            title="Licenses" 
            value={stats.totalLicenses} 
            icon={<FaIdBadge className="text-purple-500" size={14} />}
            color="purple"
            darkMode={darkMode}
            trend="down"
          />
          <OverviewCard 
            title="Perbaikan" 
            value={stats.devicesNeedingRepair} 
            icon={<FaTools className="text-orange-500" size={14} />}
            color="orange"
            darkMode={darkMode}
            trend="warning"
          />
          <OverviewCard 
            title="Stok Habis" 
            value={stats.zeroStockItems} 
            icon={<FaBoxOpen className="text-red-500" size={14} />}
            color="red"
            darkMode={darkMode}
            trend="danger"
          />
          <OverviewCard 
            title="License Alert" 
            value={stats.licenseWarnings} 
            icon={<FaExclamationTriangle className="text-yellow-500" size={14} />}
            color="yellow"
            darkMode={darkMode}
            trend="warning"
          />
        </motion.div>

        {/* Main Content Grid - Enhanced for Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          
          {/* Left Column */}
          <div className="space-y-3 sm:space-y-4">
            
            {/* Device Status Chart - Enhanced for Mobile */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-lg font-semibold flex items-center">
                  <FaChartPie className="mr-2 text-blue-500" size={14} />
                  Status Perangkat
                </h2>
                <span className="text-xs text-gray-500 dark:text-gray-400">{deviceData.length} devices</span>
              </div>
              
              <div className="flex flex-col items-center">
                {/* Enhanced Pie Chart for Mobile */}
                <div className="relative mb-4">
                  <PieChart pieData={pieData} size={120} />
                </div>
                
                {/* Status Legend - Enhanced for Mobile */}
                <div className="w-full grid grid-cols-2 gap-2">
                  {pieData.map(s => (
                    <motion.div 
                      key={s.key} 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    >
                      <span className="text-lg mr-2">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{s.value}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            darkMode ? 'bg-gray-700' : 'bg-gray-100'
                          }`}>
                            {Math.round((s.value / deviceData.length) * 100)}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Recent Activity - Enhanced for Mobile */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaListUl className="text-blue-500" size={14} />
                  <h2 className="text-sm sm:text-lg font-semibold">Aktivitas Terakhir</h2>
                </div>
                <button className="text-xs text-blue-500 font-medium">Lihat Semua</button>
              </div>
              
              <div className="space-y-2">
                {latestActivities.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Belum ada aktivitas</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {latestActivities.map((act, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                      >
                        <div className={`w-2 h-2 rounded-full mr-3 ${
                          act.type === 'device' ? 'bg-blue-500' : 'bg-green-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{act.text}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {act.waktu ? new Date(act.waktu).toLocaleString("id-ID", {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : "Waktu tidak tersedia"}
                          </p>
                        </div>
                        <FaChevronRight className="text-gray-400 text-xs" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right Column */}
          <div className="space-y-3 sm:space-y-4">
            
            {/* Notifications - Enhanced for Mobile */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaBell className="text-yellow-500" size={14} />
                  <h2 className="text-sm sm:text-lg font-semibold">Notifikasi</h2>
                  {(notifPerluPerbaikan || notifLicenseWarning || notifPeripheralHabis) && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full"
                    >
                      {[notifPerluPerbaikan, notifLicenseWarning, notifPeripheralHabis].filter(Boolean).length}
                    </motion.span>
                  )}
                </div>
                <button className="text-xs text-blue-500 font-medium">Clear All</button>
              </div>
              
              <div className="space-y-3">
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-6"
                  >
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tidak ada notifikasi</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Semua sistem berjalan normal</p>
                  </motion.div>
                )}
              </div>
            </GlassCard>

            {/* Quick Actions - Enhanced for Mobile */}
            <GlassCard darkMode={darkMode} className="p-3 sm:p-4">
              <h2 className="text-sm sm:text-lg font-semibold mb-4">Akses Cepat</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickActionButton 
                  title="Devices"
                  icon={<FaDesktop size={16} />}
                  onClick={() => navigate("/devices")}
                  color="blue"
                  darkMode={darkMode}
                  subtitle="Manage devices"
                />
                <QuickActionButton 
                  title="Peripheral"
                  icon={<FaPlug size={16} />}
                  onClick={() => navigate("/peripheral")}
                  color="green"
                  darkMode={darkMode}
                  subtitle="Stock management"
                />
                <QuickActionButton 
                  title="Licenses"
                  icon={<FaIdBadge size={16} />}
                  onClick={() => navigate("/licenses")}
                  color="purple"
                  darkMode={darkMode}
                  subtitle="License overview"
                />
                <QuickActionButton 
                  title="Helpdesk"
                  icon={<FaTools size={16} />}
                  onClick={() => navigate("/helpdesk/entry")}
                  color="orange"
                  darkMode={darkMode}
                  subtitle="Support tickets"
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="grid grid-cols-4 gap-1">
          {[
            { icon: FaDesktop, label: "Devices", path: "/devices" },
            { icon: FaPlug, label: "Peripheral", path: "/peripheral" },
            { icon: FaIdBadge, label: "Licenses", path: "/licenses" },
            { icon: FaTools, label: "Helpdesk", path: "/helpdesk/entry" }
          ].map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center p-2 rounded-lg text-xs transition-colors"
            >
              <item.icon size={16} className="mb-1" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced Overview Card Component with Trend Indicator
function OverviewCard({ title, value, icon, color, darkMode, trend }) {
  const colorClasses = {
    blue: { 
      bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'bg-blue-900/20', darkText: 'text-blue-400',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: { 
      bg: 'bg-green-100', text: 'text-green-600', darkBg: 'bg-green-900/20', darkText: 'text-green-400',
      gradient: 'from-green-500 to-green-600'
    },
    purple: { 
      bg: 'bg-purple-100', text: 'text-purple-600', darkBg: 'bg-purple-900/20', darkText: 'text-purple-400',
      gradient: 'from-purple-500 to-purple-600'
    },
    orange: { 
      bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'bg-orange-900/20', darkText: 'text-orange-400',
      gradient: 'from-orange-500 to-orange-600'
    },
    red: { 
      bg: 'bg-red-100', text: 'text-red-600', darkBg: 'bg-red-900/20', darkText: 'text-red-400',
      gradient: 'from-red-500 to-red-600'
    },
    yellow: { 
      bg: 'bg-yellow-100', text: 'text-yellow-600', darkBg: 'bg-yellow-900/20', darkText: 'text-yellow-400',
      gradient: 'from-yellow-500 to-yellow-600'
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
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`relative p-3 rounded-xl shadow-sm transition-all duration-300 overflow-hidden ${
        darkMode 
          ? `bg-gray-800 hover:bg-gray-750 ${colorClasses[color].darkBg}` 
          : `bg-white hover:bg-gray-50 ${colorClasses[color].bg}`
      }`}
    >
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${colorClasses[color].gradient} opacity-5`}></div>
      
      <div className="relative flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
          <p className={`text-xl font-bold ${darkMode ? colorClasses[color].darkText : colorClasses[color].text}`}>
            {value}
          </p>
          <div className="flex items-center mt-1">
            <span className="text-xs">{trendIcons[trend]}</span>
            <span className="text-xs ml-1 text-gray-500">vs kemarin</span>
          </div>
        </div>
        <motion.div 
          whileHover={{ rotate: 15, scale: 1.1 }}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-sm`}
        >
          {icon}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Enhanced Notification Item Component
function NotificationItem({ type, title, content, darkMode, time }) {
  const typeStyles = {
    warning: {
      icon: '🟠',
      bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50',
      border: darkMode ? 'border-orange-700' : 'border-orange-200',
      text: darkMode ? 'text-orange-300' : 'text-orange-800'
    },
    danger: {
      icon: '🔴',
      bg: darkMode ? 'bg-red-900/20' : 'bg-red-50',
      border: darkMode ? 'border-red-700' : 'border-red-200',
      text: darkMode ? 'text-red-300' : 'text-red-800'
    },
    info: {
      icon: '🔵',
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: darkMode ? 'border-blue-700' : 'border-blue-200',
      text: darkMode ? 'text-blue-300' : 'text-blue-800'
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded-lg border ${typeStyles[type].bg} ${typeStyles[type].border}`}
    >
      <div className="flex items-start">
        <span className="text-lg mr-3">{typeStyles[type].icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className={`font-medium text-sm ${typeStyles[type].text}`}>{title}</p>
            <span className="text-xs text-gray-500">{time}</span>
          </div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{content}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Enhanced Quick Action Button Component
function QuickActionButton({ title, icon, onClick, color, darkMode, subtitle }) {
  const colorClasses = {
    blue: { 
      bg: 'bg-blue-500', hover: 'hover:bg-blue-600',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: { 
      bg: 'bg-green-500', hover: 'hover:bg-green-600',
      gradient: 'from-green-500 to-green-600'
    },
    purple: { 
      bg: 'bg-purple-500', hover: 'hover:bg-purple-600',
      gradient: 'from-purple-500 to-purple-600'
    },
    orange: { 
      bg: 'bg-orange-500', hover: 'hover:bg-orange-600',
      gradient: 'from-orange-500 to-orange-600'
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`p-3 rounded-xl text-white bg-gradient-to-r ${colorClasses[color].gradient} shadow-lg transition-all duration-200 flex flex-col items-center justify-center relative overflow-hidden`}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 bg-white/10 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
      
      <div className="text-2xl mb-2 relative z-10">{icon}</div>
      <span className="text-sm font-medium relative z-10">{title}</span>
      {subtitle && (
        <span className="text-xs opacity-90 mt-1 relative z-10">{subtitle}</span>
      )}
    </motion.button>
  );
}

// Enhanced Pie Chart Component
function PieChart({ pieData, size = 100 }) {
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
            <path 
              key={i} 
              d={d} 
              fill={s.color} 
              stroke="#fff" 
              strokeWidth={2}
              className="transition-all duration-300 cursor-pointer"
              style={{ opacity: activeIndex === null || activeIndex === i ? 1 : 0.7 }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
          );
        })}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={2} />
        <text 
          x={cx} 
          y={cy} 
          textAnchor="middle" 
          dominantBaseline="middle" 
          fontSize={size * 0.12} 
          fontWeight="bold" 
          fill="currentColor"
        >
          {total}
        </text>
      </svg>
      
      {/* Enhanced Tooltip */}
      {activeIndex !== null && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bg-gray-900 text-white p-2 rounded-lg text-xs shadow-xl z-10"
          style={{ 
            top: '50%', 
            left: size + 10,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="font-semibold">{pieData[activeIndex].name}</div>
          <div>{pieData[activeIndex].value} devices</div>
          <div>{Math.round((pieData[activeIndex].value / total) * 100)}%</div>
        </motion.div>
      )}
    </div>
  );
}