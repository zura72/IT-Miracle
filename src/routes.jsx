import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

/* ============= Layout & Pages ============= */
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Devices from "./pages/Devices";
import Licenses from "./pages/Licenses";
import Peripheral from "./pages/Peripheral";
import Settings from "./pages/Settings";
import ChartsLicense from "./pages/charts/ChartsLicense";
import ChartsPeripheral from "./pages/charts/ChartsPeripheral";
import ChartsDevice from "./pages/charts/ChartsDevice";
import ChartHelpdesk from "./pages/charts/ChartHelpdesk";
import TicketEntry from "./pages/helpdesk/TicketEntry";
import TicketSolved from "./pages/helpdesk/TicketSolved";
import DataSharepoint from "./pages/helpdesk/DataSharepoint";
import ChatHost from "./pages/user/ChatHost";

/* ============= Admin helpers ============= */
import {
  getAdminSetCached,
  resolveMsalEmail,
  FALLBACK_ADMIN_EMAIL,
} from "./constants/admin";

/* ============= dev-only logger ============= */
const isDev = process.env.NODE_ENV === "development";
const dev = {
  log: (...a) => isDev && console.log(...a),
  warn: (...a) => isDev && console.warn(...a),
};

/* ============= Admin Gate Hook ============= */
function useAdminGate() {
  const { accounts } = useMsal();
  const [adminSet, setAdminSet] = useState(null);

  const email = useMemo(() => resolveMsalEmail(accounts?.[0]), [accounts]);

  useEffect(() => {
    let isMounted = true;
    
    const loadAdminSet = async () => {
      try {
        const set = await getAdminSetCached();
        if (isMounted) setAdminSet(set);
      } catch (error) {
        dev.warn("Failed to load admin set:", error);
        if (isMounted) setAdminSet(new Set());
      }
    };

    loadAdminSet();

    return () => {
      isMounted = false;
    };
  }, []);

  const ready = adminSet !== null;
  const isAdmin = ready && !!email && (adminSet.has(email) || email === FALLBACK_ADMIN_EMAIL);

  return { ready, isAdmin, email };
}

/* ============= Guards & Layout ============= */
function RequireAdmin({ children }) {
  const { ready, isAdmin } = useAdminGate();
  
  if (!ready) return <div className="p-6 flex justify-center items-center min-h-screen">Loading…</div>;
  if (!isAdmin) return <Navigate to="/chat" replace />;
  
  return children;
}

function ThemedLayout({ children }) {
  const [dark, setDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 min-h-screen">
      <Sidebar dark={dark} toggleDark={() => setDark(v => !v)} />
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {children}
      </main>
    </div>
  );
}

/* ============= Landing decider ============= */
function LandingRouter() {
  const { ready, isAdmin, email } = useAdminGate();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    
    const target = isAdmin ? "/dashboard" : "/chat";
    dev.log("[LandingRouter] email:", email, "→", target);
    navigate(target, { replace: true });
  }, [ready, isAdmin, navigate, email]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Mengarahkan…</div>
    </div>
  );
}

/* ============= Helper component untuk admin routes ============= */
const AdminLayout = ({ children }) => (
  <RequireAdmin>
    <ThemedLayout>
      {children}
    </ThemedLayout>
  </RequireAdmin>
);

/* ============= Main Routes Component ============= */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Setelah login mendarat ke sini */}
      <Route path="/" element={<LandingRouter />} />

      {/* CHAT fullscreen (tanpa sidebar) */}
      <Route path="/chat" element={<ChatHost />} />

      {/* ADMIN routes dengan layout */}
      <Route path="/dashboard" element={
        <AdminLayout>
          <Dashboard />
        </AdminLayout>
      } />
      <Route path="/devices" element={
        <AdminLayout>
          <Devices />
        </AdminLayout>
      } />
      <Route path="/peripheral" element={
        <AdminLayout>
          <Peripheral />
        </AdminLayout>
      } />
      <Route path="/licenses" element={
        <AdminLayout>
          <Licenses />
        </AdminLayout>
      } />
      <Route path="/settings" element={
        <AdminLayout>
          <Settings />
        </AdminLayout>
      } />
      <Route path="/charts/license" element={
        <AdminLayout>
          <ChartsLicense />
        </AdminLayout>
      } />
      <Route path="/charts/peripheral" element={
        <AdminLayout>
          <ChartsPeripheral />
        </AdminLayout>
      } />
      <Route path="/charts/device" element={
        <AdminLayout>
          <ChartsDevice />
        </AdminLayout>
      } />
      <Route path="/charts/helpdesk" element={
        <AdminLayout>
          <ChartHelpdesk />
        </AdminLayout>
      } />
      <Route path="/helpdesk/entry" element={
        <AdminLayout>
          <TicketEntry />
        </AdminLayout>
      } />
      <Route path="/helpdesk/solved" element={
        <AdminLayout>
          <TicketSolved />
        </AdminLayout>
      } />
      <Route path="/helpdesk/sharepoint" element={
        <AdminLayout>
          <DataSharepoint />
        </AdminLayout>
      } />

      {/* Fallback untuk route yang tidak ditemukan */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}