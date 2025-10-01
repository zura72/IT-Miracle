// src/pages/helpdesk/TicketSolved.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaFilter, FaSync, FaPlus, FaEdit, FaTrash, 
  FaPrint, FaCamera, FaUser, FaBuilding, FaCalendar,
  FaCheck, FaTimes, FaPaperclip, FaDownload, FaEye,
  FaExclamationTriangle, FaExclamationCircle, FaInfoCircle,
  FaChevronDown, FaChevronUp
} from "react-icons/fa";

/* ===================== KONFIGURASI ===================== */
// Environment
function readEnv(viteKey, craKey) {
  let vite = {};
  try { vite = (import.meta && import.meta.env) || {}; } catch {}
  const cra = (typeof process !== "undefined" && process.env) || {};
  return vite[viteKey] ?? cra[craKey] ?? "";
}
const RAW_API_BASE = readEnv("VITE_API_BASE", "REACT_APP_API_BASE") || "http://localhost:4000";
const API_BASE = String(RAW_API_BASE).replace(/\/+$/, "");

// SharePoint
const siteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const TICKET_LIST_ID = "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];
const TICKET_LIST_NAME_FOR_ATTACH = "Tickets";
const DONE_PHOTO_FIELD = "ScreenshotBuktiTicketsudahDilaku";
const PROOF_IMAGES_FIELD = "Images";

// List Divisi yang Baru - Diperbaiki dan disusun rapi
const DIVISI_OPTIONS = [
  "Sekretariat Perusahaan",
  "Internal Audit", 
  "Keuangan",
  "Akutansi",
  "HCM",
  "Manajemen Resiko",
  "Legal",
  "Pemasaran",
  "Produksi & Peralatan",
  "Pengembangan Bisnis & Portofolio",
  "Pengendalian Proyek & SCM",
  "TI & Sistem",
  "QHSE",
  "Produksi & Peralatan WS 1",
  "Produksi & Peralatan WS 2",
  "WS 1",
  "WS 2",
  "BOD",
  "WWE",
  "WSE",
  "Project Coordinator",
  "Proyek",
  "Umum"
];

// Warna untuk setiap divisi - Lebih Banyak Variasi
const DIVISI_COLORS = {
  "Sekretariat Perusahaan": { bg: "bg-purple-500", hover: "hover:bg-purple-600", text: "text-white", gradient: "from-purple-500 to-purple-600" },
  "Internal Audit": { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", text: "text-white", gradient: "from-indigo-500 to-indigo-600" },
  "Keuangan": { bg: "bg-green-500", hover: "hover:bg-green-600", text: "text-white", gradient: "from-green-500 to-green-600" },
  "Akutansi": { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", text: "text-white", gradient: "from-emerald-500 to-emerald-600" },
  "HCM": { bg: "bg-pink-500", hover: "hover:bg-pink-600", text: "text-white", gradient: "from-pink-500 to-pink-600" },
  "Manajemen Resiko": { bg: "bg-red-500", hover: "hover:bg-red-600", text: "text-white", gradient: "from-red-500 to-red-600" },
  "Legal": { bg: "bg-blue-500", hover: "hover:bg-blue-600", text: "text-white", gradient: "from-blue-500 to-blue-600" },
  "Pemasaran": { bg: "bg-teal-500", hover: "hover:bg-teal-600", text: "text-white", gradient: "from-teal-500 to-teal-600" },
  "Produksi & Peralatan": { bg: "bg-orange-500", hover: "hover:bg-orange-600", text: "text-white", gradient: "from-orange-500 to-orange-600" },
  "Pengembangan Bisnis & Portofolio": { bg: "bg-cyan-500", hover: "hover:bg-cyan-600", text: "text-white", gradient: "from-cyan-500 to-cyan-600" },
  "Pengendalian Proyek & SCM": { bg: "bg-amber-500", hover: "hover:bg-amber-600", text: "text-white", gradient: "from-amber-500 to-amber-600" },
  "TI & Sistem": { bg: "bg-violet-500", hover: "hover:bg-violet-600", text: "text-white", gradient: "from-violet-500 to-violet-600" },
  "QHSE": { bg: "bg-lime-500", hover: "hover:bg-lime-600", text: "text-white", gradient: "from-lime-500 to-lime-600" },
  "Produksi & Peralatan WS 1": { bg: "bg-rose-500", hover: "hover:bg-rose-600", text: "text-white", gradient: "from-rose-500 to-rose-600" },
  "Produksi & Peralatan WS 2": { bg: "bg-fuchsia-500", hover: "hover:bg-fuchsia-600", text: "text-white", gradient: "from-fuchsia-500 to-fuchsia-600" },
  "WS 1": { bg: "bg-sky-500", hover: "hover:bg-sky-600", text: "text-white", gradient: "from-sky-500 to-sky-600" },
  "WS 2": { bg: "bg-cyan-500", hover: "hover:bg-cyan-600", text: "text-white", gradient: "from-cyan-500 to-cyan-600" },
  "BOD": { bg: "bg-red-600", hover: "hover:bg-red-700", text: "text-white", gradient: "from-red-600 to-red-700" },
  "WWE": { bg: "bg-blue-600", hover: "hover:bg-blue-700", text: "text-white", gradient: "from-blue-600 to-blue-700" },
  "WSE": { bg: "bg-green-600", hover: "hover:bg-green-700", text: "text-white", gradient: "from-green-600 to-green-700" },
  "Project Coordinator": { bg: "bg-purple-600", hover: "hover:bg-purple-700", text: "text-white", gradient: "from-purple-600 to-purple-700" },
  "Proyek": { bg: "bg-indigo-600", hover: "hover:bg-indigo-700", text: "text-white", gradient: "from-indigo-600 to-indigo-700" },
  "Umum": { bg: "bg-gray-500", hover: "hover:bg-gray-600", text: "text-white", gradient: "from-gray-500 to-gray-600" },
};

// Warna untuk prioritas
const PRIORITY_COLORS = {
  "High": { bg: "bg-red-500", hover: "hover:bg-red-600", text: "text-white", icon: FaExclamationTriangle, gradient: "from-red-500 to-red-600" },
  "Normal": { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", text: "text-white", icon: FaExclamationCircle, gradient: "from-yellow-500 to-yellow-600" },
  "Low": { bg: "bg-green-500", hover: "hover:bg-green-600", text: "text-white", icon: FaInfoCircle, gradient: "from-green-500 to-green-600" },
};

// Warna untuk status
const STATUS_COLORS = {
  "Completed": { bg: "bg-green-500", hover: "hover:bg-green-600", text: "text-white", icon: FaCheck, gradient: "from-green-500 to-green-600" },
  "Pending": { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", text: "text-white", icon: FaExclamationCircle, gradient: "from-yellow-500 to-yellow-600" },
  "Belum": { bg: "bg-red-500", hover: "hover:bg-red-600", text: "text-white", icon: FaTimes, gradient: "from-red-500 to-red-600" },
};

/* ===================== UTILITIES ===================== */
const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function fmtWaktu(s) {
  try {
    return new Date(s).toLocaleString("id-ID", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return s || "-"; }
}

function byNewest(a, b) {
  const fa = a.fields || a;
  const fb = b.fields || b;
  const aTime = Date.parse(fa.DateFinished || fa.Created || fa.DateReported || 0) || 0;
  const bTime = Date.parse(fb.DateFinished || fb.Created || fb.DateReported || 0) || 0;
  return bTime - aTime;
}

function pickFirst(...cands) {
  for (const c of cands) if (c != null && c !== "") return c;
  return null;
}

function toPerson(v) {
  if (!v) return null;
  if (typeof v === "string") {
    const email = v.includes("@") ? (v.match(/[^\s|;<>"]+@[^\s|;<>"]+/)?.[0] || "") : "";
    const raw = v.split("|").pop() || v;
    const nameFromEmail = email ? email.split("@")[0].replace(/[._]/g, " ") : raw;
    return { displayName: nameFromEmail, email };
  }
  if (typeof v === "object") {
    return {
      displayName: v.displayName || v.Title || v.title || v.Name || v.EMail || v.email || v.mail || "",
      email: v.email || v.EMail || v.mail || ""
    };
  }
  return null;
}

function mapSpItem(item) {
  const f = item.fields || {};
  
  // User Requestor
  let userReq = null;
  const fieldPriority = ['UserRequestor', 'User_x0020_Requestor', 'RequestedBy', 'Requestor', 'Pemohon', 'Author', 'CreatedBy'];
  
  for (const fieldName of fieldPriority) {
    if (f[fieldName]) {
      if (typeof f[fieldName] === 'object') {
        if (fieldName === 'CreatedBy' && f[fieldName].user) {
          userReq = {
            displayName: f[fieldName].user.displayName || '',
            email: f[fieldName].user.email || ''
          };
        } else {
          userReq = {
            displayName: f[fieldName].Title || f[fieldName].displayName || f[fieldName].Name || '',
            email: f[fieldName].EMail || f[fieldName].Email || f[fieldName].mail || ''
          };
        }
        if (userReq.displayName) break;
      } else if (typeof f[fieldName] === 'string') {
        userReq = toPerson(f[fieldName]);
        if (userReq.displayName) break;
      }
    }
  }

  // Pelaksana
  let assigned = null;
  const executorFields = ['Assignedto0', 'AssignedTo', 'Pelaksana', 'Executor'];
  
  for (const fieldName of executorFields) {
    if (f[fieldName]) {
      if (typeof f[fieldName] === 'object') {
        assigned = {
          displayName: f[fieldName].Title || f[fieldName].displayName || f[fieldName].Name || '',
          email: f[fieldName].EMail || f[fieldName].Email || f[fieldName].mail || ''
        };
        if (assigned.displayName) break;
      } else if (typeof f[fieldName] === 'string') {
        assigned = toPerson(f[fieldName]);
        if (assigned.displayName) break;
      }
    }
  }

  const executor = assigned || (f.Issueloggedby ? { displayName: f.Issueloggedby, email: "" } : null);

  return {
    spId: item.id,
    Title: f.Title || "",
    TicketNumber: f.TicketNumber || item.id,
    Description: f.Description || "",
    Priority: f.Priority || "Normal",
    Status: f.Status || "",
    Divisi: f.Divisi || "Umum",
    DateReported: f.DateReported || f.Created || "",
    DateFinished: f.DateFinished || "",
    UserRequestor: userReq,
    Assignedto0: executor,
    TipeTicket: f.TipeTicket || "",
    Issueloggedby: f.Issueloggedby || "",
    Author: toPerson(f.Author) || null,
    [DONE_PHOTO_FIELD]: f[DONE_PHOTO_FIELD] || "",
    HasAttachments: !!f.Attachments,
  };
}

function buildFieldsPayload(src) {
  return {
    Title: src.Title || (src.Description ? String(src.Description).slice(0, 120) : `Ticket ${src.TicketNumber || ""}`),
    TicketNumber: src.TicketNumber || "",
    Description: src.Description || "",
    Priority: src.Priority || "Normal",
    Status: src.Status || "Completed",
    Divisi: src.Divisi || "Umum",
    DateReported: src.DateReported || undefined,
    DateFinished: src.DateFinished || undefined,
    TipeTicket: src.TipeTicket || undefined,
    Assignedto0: src.Assignedto0 || undefined,
    Issueloggedby: src.Issueloggedby || undefined,
  };
}

// GlassCard Component
const GlassCard = ({ children, className = '', darkMode, delay = 0 }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: "easeOut" }}
    className={`rounded-2xl backdrop-blur-lg border border-opacity-20 
      ${darkMode 
        ? 'bg-gray-800/70 border-gray-600 shadow-2xl shadow-black/30 text-white' 
        : 'bg-white/80 border-gray-300 shadow-2xl shadow-blue-100 text-gray-800'
      } 
      transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

// Animated Filter Button Component - Lebih Smooth
const AnimatedFilterButton = ({ value, onClick, isActive, colorConfig, children }) => {
  const IconComponent = colorConfig?.icon;
  
  return (
    <motion.button
      whileHover={{ 
        scale: 1.05,
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center space-x-2 relative overflow-hidden ${
        isActive 
          ? `bg-gradient-to-r ${colorConfig.gradient} text-white shadow-lg ring-2 ring-white/20` 
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
      }`}
    >
      {/* Animated background for active state */}
      {isActive && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-white/10 rounded-xl"
        />
      )}
      
      {IconComponent && <IconComponent className="text-sm" />}
      <span className="relative z-10">{children}</span>
      
      {isActive && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="relative z-10 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center"
        >
          <FaCheck className="text-white text-xs" />
        </motion.div>
      )}
    </motion.button>
  );
};

// Smooth Collapsible Section Component - Diperbaiki untuk animasi lebih smooth
const SmoothCollapsible = ({ title, icon: Icon, isOpen, onToggle, children, darkMode }) => {
  return (
    <motion.div 
      layout
      className={`rounded-2xl border transition-all duration-300 ${
        darkMode 
          ? 'border-gray-600 bg-gray-800/50' 
          : 'border-gray-200 bg-white/50'
      } ${isOpen ? 'shadow-lg' : 'shadow-md'}`}
    >
      <motion.button
        layout
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between text-left rounded-2xl transition-all duration-300 ${
          darkMode 
            ? 'hover:bg-gray-700/50' 
            : 'hover:bg-gray-50'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`text-lg ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          <span className={`font-semibold text-lg ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          {isOpen ? <FaChevronUp className="text-sm" /> : <FaChevronDown className="text-sm" />}
        </motion.div>
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ 
              duration: 0.4, 
              ease: "easeInOut",
              height: { duration: 0.3, ease: "easeInOut" }
            }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 pt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Enhanced Filter Section Component - Diperbaiki untuk animasi lebih smooth
const EnhancedFilterSection = ({ title, icon: Icon, isOpen, onToggle, children, darkMode }) => {
  return (
    <motion.div 
      layout
      className={`rounded-2xl border transition-all duration-500 ${
        darkMode 
          ? 'border-gray-600 bg-gray-800/50' 
          : 'border-gray-200 bg-white/50'
      } ${isOpen ? 'shadow-xl' : 'shadow-lg'}`}
    >
      <motion.button
        layout
        onClick={onToggle}
        className={`w-full px-6 py-4 flex items-center justify-between text-left rounded-2xl transition-all duration-500 ${
          darkMode 
            ? 'hover:bg-gray-700/60' 
            : 'hover:bg-gray-50/80'
        }`}
        whileHover={{ 
          scale: 1.02,
          transition: { duration: 0.2 }
        }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: isOpen ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={`text-lg ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          </motion.div>
          <span className={`font-semibold text-lg ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
        >
          {isOpen ? <FaChevronUp className="text-sm" /> : <FaChevronDown className="text-sm" />}
        </motion.div>
      </motion.button>
      
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: 1, 
              height: "auto",
              transition: { 
                opacity: { duration: 0.3, ease: "easeOut" },
                height: { duration: 0.4, ease: "easeInOut" }
              }
            }}
            exit={{ 
              opacity: 0, 
              height: 0,
              transition: { 
                opacity: { duration: 0.2, ease: "easeIn" },
                height: { duration: 0.3, ease: "easeInOut" }
              }
            }}
            className="overflow-hidden"
          >
            <motion.div 
              className="px-6 pb-4 pt-2"
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ===================== KOMPONEN UTAMA ===================== */
export default function TicketSolved() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const location = useLocation();

  // State SharePoint
  const [rowsSP, setRowsSP] = useState([]);
  const [loadingSP, setLoadingSP] = useState(false);
  const [notif, setNotif] = useState("");
  const [qSP, setQSP] = useState("");
  const [filterSP, setFilterSP] = useState({ Divisi: "", Priority: "", Status: "" });
  const [sel, setSel] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: "", data: {} });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [openSections, setOpenSections] = useState({
    divisi: true,
    priority: true,
    status: true
  });
  const fileInputRef = useRef(null);

  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  /* ====== Derived Data ====== */
  const filteredSP = useMemo(() => {
    const s = qSP.trim().toLowerCase();
    return rowsSP
      .filter((it) => {
        const f = it.fields;
        if (filterSP.Status && (f.Status || "") !== filterSP.Status) return false;
        if (filterSP.Divisi && (f.Divisi || "") !== filterSP.Divisi) return false;
        if (filterSP.Priority && (f.Priority || "") !== filterSP.Priority) return false;
        if (!s) return true;
        const reqName = f.UserRequestor?.displayName || "";
        const exeName = (f.Assignedto0?.displayName) || f.Issueloggedby || "";
        return [
          f.TicketNumber, f.Title, f.Description, f.Divisi, f.Priority, f.Status,
          f.TipeTicket, exeName, reqName, f.Author?.displayName, f.Author?.email,
          it.id, it.fields?.spId
        ].join(" ").toLowerCase().includes(s);
      })
      .sort(byNewest);
  }, [rowsSP, qSP, filterSP]);

  /* ====== Effects ====== */
  useEffect(() => {
    fetchFromSP();
  }, []);

  /* ===================== SHAREPOINT API ===================== */
  async function fetchFromSP() {
    setLoadingSP(true);
    try {
      const account = accounts?.[0];
      if (!account) throw new Error("Belum login MSAL");
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items` +
        `?$expand=fields($select=id,Title,TicketNumber,Description,Priority,Status,Divisi,DateReported,DateFinished,TipeTicket,Issueloggedby,${DONE_PHOTO_FIELD},Attachments,UserRequestor,User_x0020_Requestor,Assignedto0,AssignedTo,Pelaksana,Author)` +
        `&$top=2000`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tok.accessToken}`,
          Prefer: "HonorNonIndexedQueriesWarningMayFailRandomly=true",
        }
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error?.message || JSON.stringify(j).slice(0, 200));
      
      const items = (j.value || []).map((v) => ({ id: v.id, fields: mapSpItem(v) })).sort(byNewest);
      setRowsSP(items);
      setSel(null);
    } catch (e) {
      console.error(e);
      setNotif("Gagal mengambil data SharePoint: " + (e?.message || e));
      setRowsSP([]);
    } finally {
      setLoadingSP(false);
    }
  }

  /* ===================== CRUD OPERATIONS ===================== */
  function openCreate() {
    resetPhoto();
    setModal({
      open: true, mode: "create",
      data: {
        Title: "", TicketNumber: "", Description: "",
        Priority: "Normal", Status: "Completed", Divisi: "Umum",
        DateReported: new Date().toISOString(),
        DateFinished: new Date().toISOString(),
        TipeTicket: "", Assignedto0: "", Issueloggedby: "",
      }
    });
  }

  function openEdit() {
    if (!sel) return;
    resetPhoto();
    setModal({ open: true, mode: "edit", data: { ...sel.fields, spId: sel.id } });
  }

  async function handleDelete() {
    if (!sel) return;
    if (!window.confirm(`Hapus Ticket #${sel.fields.TicketNumber || sel.id}?`)) return;
    setLoadingSP(true);
    try {
      const account = accounts?.[0];
      const tok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${sel.id}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${tok.accessToken}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      setNotif("Data berhasil dihapus.");
      await fetchFromSP();
    } catch (e) {
      console.error(e);
      setNotif("Gagal menghapus: " + (e?.message || e));
    } finally {
      setLoadingSP(false);
    }
  }

  async function doCreateOrEdit(e) {
    e.preventDefault();
    if (loadingSP) return;
    setLoadingSP(true);
    try {
      const account = accounts?.[0];
      const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const formData = new FormData(e.currentTarget);
      const data = Object.fromEntries(formData.entries());
      const fields = buildFieldsPayload({
        Title: data.Title, TicketNumber: data.TicketNumber, Description: data.Description,
        Priority: data.Priority || "Normal", Status: data.Status || "Completed",
        Divisi: data.Divisi || "Umum", DateReported: data.DateReported || undefined,
        DateFinished: data.DateFinished || undefined, TipeTicket: data.TipeTicket || undefined,
        Assignedto0: data.Assignedto0 || undefined, Issueloggedby: data.Issueloggedby || undefined,
      });

      let itemId = null;
      if (modal.mode === "create") {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items`,
          { method: "POST", headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields }) }
        );
        if (!res.ok) throw new Error(await res.text());
        const created = await res.json();
        itemId = created?.id;
      } else {
        itemId = sel?.id;
        if (!itemId) throw new Error("Tidak ada item terpilih.");
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${TICKET_LIST_ID}/items/${itemId}/fields`,
          { method: "PATCH", headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(fields) }
        );
        if (!res.ok) throw new Error(await res.text());
      }

      if (itemId && photoFile) {
        const saved = await uploadAttachmentToSP(instance, accounts, itemId, photoFile);
        await setDonePhotoMetaOnSP(instance, accounts, itemId, saved.fileName);
      }

      setNotif(modal.mode === "create" ? "Berhasil menambahkan data." : "Perubahan tersimpan.");
      setModal({ open: false, mode: "", data: {} });
      resetPhoto();
      await fetchFromSP();
    } catch (e) {
      console.error(e);
      setNotif("Gagal simpan: " + (e?.message || e));
    } finally {
      setLoadingSP(false);
    }
  }

  /* ===================== PHOTO HANDLING ===================== */
  function onPickPhoto(e) {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      const url = URL.createObjectURL(f);
      setPhotoPreview(url);
    }
  }

  function removePhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetPhoto() { removePhoto(); }

  /* ===================== FILTER HANDLERS ===================== */
  const handleDivisiFilter = (divisi) => {
    setFilterSP(f => ({ ...f, Divisi: f.Divisi === divisi ? "" : divisi }));
  };

  const handlePriorityFilter = (priority) => {
    setFilterSP(f => ({ ...f, Priority: f.Priority === priority ? "" : priority }));
  };

  const handleStatusFilter = (status) => {
    setFilterSP(f => ({ ...f, Status: f.Status === status ? "" : status }));
  };

  const resetAllFilters = () => {
    setFilterSP({ Divisi: "", Priority: "", Status: "" });
    setQSP("");
  };

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  /* ===================== PRINT FUNCTIONS ===================== */
  function handlePrintSP() {
    const items = filteredSP;
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Solved (SharePoint)</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#000; }
        h1 { margin:0 0 8px; font-size:18px; }
        table { width:100%; border-collapse:collapse; border:1.5pt solid #000; }
        th,td { border:0.9pt solid #000; padding:6px 8px; vertical-align:top; }
        thead th { background:#f3f4f6; text-align:left; }
      </style>
    `;
    const body = items.map(it => {
      const f = it.fields;
      const req = f.UserRequestor?.displayName || "";
      const exe = (f.Assignedto0?.displayName) || f.Issueloggedby || "";
      return `
        <tr>
          <td>${esc(f.TicketNumber)}</td>
          <td>${esc(fmtWaktu(f.DateReported))}</td>
          <td>${esc(fmtWaktu(f.DateFinished))}</td>
          <td>${esc(req)}</td>
          <td>${esc(exe)}</td>
          <td>${esc(f.Divisi)}</td>
          <td>${esc(f.Priority)}</td>
          <td>${esc(f.Status)}</td>
          <td>${esc(f.Description)}</td>
        </tr>`;
    }).join("");
    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Solved (SharePoint)</h1>
      <table>
        <thead><tr>
          <th>No. Ticket</th><th>Waktu Lapor</th><th>Waktu Selesai</th><th>User Requestor</th><th>Pelaksana</th>
          <th>Divisi</th><th>Prioritas</th><th>Status</th><th>Deskripsi</th>
        </tr></thead><tbody>${body}</tbody></table>
      <script>onload=()=>{print();setTimeout(()=>close(),300)}</script>
    </body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ===================== RENDER ===================== */
  return (
    <div className={`min-h-screen py-6 transition-colors duration-300 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-gray-100'}`}>
      
      {/* Notification */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl font-semibold transition-all duration-300 cursor-pointer ${darkMode ? 'bg-green-700' : 'bg-green-600'} text-white max-w-md text-center`}
            onClick={() => setNotif("")}
          >
            {notif}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container utama - Lebar penuh */}
      <div className="w-full px-8 ml-0">
        <GlassCard darkMode={darkMode} className="p-8">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6"
          >
            <div className="flex-1">
              <h1 className={`text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                Ticket Solved
              </h1>
              <p className={`mt-2 text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Daftar tiket yang sudah diselesaikan - SharePoint List
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`px-6 py-3 rounded-xl font-medium transition flex items-center space-x-3 ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={fetchFromSP}
                disabled={loadingSP}
              >
                <FaSync className={loadingSP ? "animate-spin" : ""} />
                <span className="text-lg">Refresh</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition flex items-center space-x-3"
                onClick={openCreate}
              >
                <FaPlus className="text-lg" />
                <span className="text-lg">Tambah Ticket</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1">
                <div className={`relative rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
                  <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-lg`} />
                  <input
                    type="text"
                    placeholder="Cari tiket berdasarkan nomor, deskripsi, user..."
                    value={qSP}
                    onChange={(e) => setQSP(e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-lg ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'}`}
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-4 rounded-xl font-medium flex items-center justify-center space-x-3 ${darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600'} shadow-lg`}
              >
                <FaFilter className="text-lg" />
                <span className="text-lg">{showFilters ? "Sembunyikan Filter" : "Tampilkan Filter"}</span>
              </motion.button>

              {/* Print Button */}
              <motion.button 
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`px-6 py-4 rounded-xl font-medium flex items-center space-x-3 ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={handlePrintSP}
              >
                <FaPrint className="text-lg" />
                <span className="text-lg">Print</span>
              </motion.button>
            </div>

            {/* Active Filters */}
            {(filterSP.Divisi || filterSP.Priority || filterSP.Status) && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-wrap gap-3 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl"
              >
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Filter Aktif:</span>
                {filterSP.Divisi && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${DIVISI_COLORS[filterSP.Divisi]?.bg || 'bg-gray-500'} text-white flex items-center space-x-2`}
                  >
                    <span>{filterSP.Divisi}</span>
                    <button onClick={() => setFilterSP(f => ({ ...f, Divisi: "" }))} className="hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center">
                      <FaTimes className="text-xs" />
                    </button>
                  </motion.span>
                )}
                {filterSP.Priority && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLORS[filterSP.Priority]?.bg || 'bg-gray-500'} text-white flex items-center space-x-2`}
                  >
                    <span>{filterSP.Priority}</span>
                    <button onClick={() => setFilterSP(f => ({ ...f, Priority: "" }))} className="hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center">
                      <FaTimes className="text-xs" />
                    </button>
                  </motion.span>
                )}
                {filterSP.Status && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, type: "spring" }}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[filterSP.Status]?.bg || 'bg-gray-500'} text-white flex items-center space-x-2`}
                  >
                    <span>{filterSP.Status}</span>
                    <button onClick={() => setFilterSP(f => ({ ...f, Status: "" }))} className="hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center">
                      <FaTimes className="text-xs" />
                    </button>
                  </motion.span>
                )}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetAllFilters}
                  className="px-3 py-1 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center space-x-2"
                >
                  <FaTimes />
                  <span>Reset Semua</span>
                </motion.button>
              </motion.div>
            )}

            {/* Filter Grid dengan Enhanced Collapsible - Diperbaiki untuk animasi lebih smooth */}
            <AnimatePresence mode="wait">
              {showFilters && (
                <motion.div 
                  key="filter-section"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: 1, 
                    height: "auto",
                    transition: { 
                      opacity: { duration: 0.4, ease: "easeOut" },
                      height: { duration: 0.5, ease: "easeInOut" }
                    }
                  }}
                  exit={{ 
                    opacity: 0, 
                    height: 0,
                    transition: { 
                      opacity: { duration: 0.3, ease: "easeIn" },
                      height: { duration: 0.4, ease: "easeInOut" }
                    }
                  }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Divisi Filter - Diperbaiki dengan animasi lebih smooth */}
                  <EnhancedFilterSection
                    title="Filter Divisi"
                    icon={FaBuilding}
                    isOpen={openSections.divisi}
                    onToggle={() => toggleSection('divisi')}
                    darkMode={darkMode}
                  >
                    <motion.div 
                      layout
                      className="flex flex-wrap gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.1, staggerChildren: 0.05 }}
                    >
                      {DIVISI_OPTIONS.map((divisi, index) => (
                        <motion.div
                          key={divisi}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: index * 0.03,
                            type: "spring",
                            stiffness: 100
                          }}
                          whileHover={{ 
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <AnimatedFilterButton
                            value={divisi}
                            onClick={() => handleDivisiFilter(divisi)}
                            isActive={filterSP.Divisi === divisi}
                            colorConfig={DIVISI_COLORS[divisi]}
                          >
                            {divisi}
                          </AnimatedFilterButton>
                        </motion.div>
                      ))}
                    </motion.div>
                  </EnhancedFilterSection>

                  {/* Priority Filter */}
                  <EnhancedFilterSection
                    title="Filter Prioritas"
                    icon={FaExclamationTriangle}
                    isOpen={openSections.priority}
                    onToggle={() => toggleSection('priority')}
                    darkMode={darkMode}
                  >
                    <motion.div 
                      layout
                      className="flex flex-wrap gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.2, staggerChildren: 0.1 }}
                    >
                      {Object.keys(PRIORITY_COLORS).map((priority, index) => (
                        <motion.div
                          key={priority}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 100
                          }}
                          whileHover={{ 
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <AnimatedFilterButton
                            value={priority}
                            onClick={() => handlePriorityFilter(priority)}
                            isActive={filterSP.Priority === priority}
                            colorConfig={PRIORITY_COLORS[priority]}
                          >
                            {priority}
                          </AnimatedFilterButton>
                        </motion.div>
                      ))}
                    </motion.div>
                  </EnhancedFilterSection>

                  {/* Status Filter */}
                  <EnhancedFilterSection
                    title="Filter Status"
                    icon={FaCheck}
                    isOpen={openSections.status}
                    onToggle={() => toggleSection('status')}
                    darkMode={darkMode}
                  >
                    <motion.div 
                      layout
                      className="flex flex-wrap gap-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: 0.3, staggerChildren: 0.1 }}
                    >
                      {Object.keys(STATUS_COLORS).map((status, index) => (
                        <motion.div
                          key={status}
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: index * 0.1,
                            type: "spring",
                            stiffness: 100
                          }}
                          whileHover={{ 
                            scale: 1.05,
                            transition: { duration: 0.2 }
                          }}
                        >
                          <AnimatedFilterButton
                            value={status}
                            onClick={() => handleStatusFilter(status)}
                            isActive={filterSP.Status === status}
                            colorConfig={STATUS_COLORS[status]}
                          >
                            {status}
                          </AnimatedFilterButton>
                        </motion.div>
                      ))}
                    </motion.div>
                  </EnhancedFilterSection>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Action Buttons untuk selected item */}
          {sel && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex gap-4 mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-lg">Ticket Terpilih: <span className="text-blue-600 dark:text-blue-400">{sel.fields.TicketNumber || sel.id}</span></span>
              </div>
              <div className="flex gap-3 ml-auto">
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-medium flex items-center space-x-3 text-lg"
                  onClick={openEdit}
                >
                  <FaEdit />
                  <span>Edit</span>
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium flex items-center space-x-3 text-lg"
                  onClick={handleDelete}
                >
                  <FaTrash />
                  <span>Hapus</span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Data Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
          >
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <Th className="w-32">No. Ticket</Th>
                      <Th className="w-48">Waktu Lapor</Th>
                      <Th className="w-48">Waktu Selesai</Th>
                      <Th className="w-64">User Requestor</Th>
                      <Th className="w-64">Pelaksana (Tim IT)</Th>
                      <Th className="w-44">Divisi</Th>
                      <Th className="w-36">Prioritas</Th>
                      <Th className="w-32">Status</Th>
                      <Th className="min-w-[500px]">Deskripsi</Th>
                      <Th className="w-32">Lampiran</Th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                    {loadingSP ? (
                      <TableLoadingState colSpan={10} darkMode={darkMode} />
                    ) : filteredSP.length === 0 ? (
                      <TableEmptyState colSpan={10} darkMode={darkMode} />
                    ) : (
                      filteredSP.map((it, i) => (
                        <RowSP 
                          key={it.id} 
                          r={it} 
                          zebra={i % 2 === 1} 
                          onSelect={() => setSel(it)}
                          selected={sel?.id === it.id} 
                          msal={{ instance, accounts }} 
                          darkMode={darkMode}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {filteredSP.length > 0 && !loadingSP && (
                <div className={`px-6 py-4 text-lg border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                  Menampilkan {filteredSP.length} dari {rowsSP.length} tiket
                </div>
              )}
            </div>
          </motion.div>
        </GlassCard>
      </div>

      {/* Modal Create/Edit */}
      {modal.open && (
        <FormModal
          mode={modal.mode}
          data={modal.data}
          onClose={() => { setModal({ open: false, mode: "", data: {} }); resetPhoto(); }}
          onSubmit={doCreateOrEdit}
          onPickPhoto={onPickPhoto}
          onRemovePhoto={removePhoto}
          fileInputRef={fileInputRef}
          photoPreview={photoPreview}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

/* ===================== LOADING & EMPTY STATES ===================== */
function TableLoadingState({ colSpan, darkMode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center">
        <div className="flex justify-center items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-12 w-12 border-b-2 border-blue-500"
          />
        </div>
        <p className={`mt-4 text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Memuat data tiket...</p>
      </td>
    </tr>
  );
}

function TableEmptyState({ colSpan, darkMode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-16 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="text-6xl mb-4"
        >
          📋
        </motion.div>
        <p className={`text-xl font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
          Tidak ada data tiket
        </p>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Coba ubah filter atau tambah tiket baru
        </p>
      </td>
    </tr>
  );
}

// Komponen Th
const Th = ({ children, className = "" }) => (
  <th className={`px-6 py-4 text-left text-sm font-semibold ${className}`}>
    {children}
  </th>
);

// Komponen Td
const Td = ({ children, className = "" }) => (
  <td className={`px-6 py-4 text-sm ${className}`}>
    {children}
  </td>
);

// Komponen Avatar
const Avatar = ({ name, email, size = 8 }) => {
  const initial = name ? name.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";
  return (
    <div className={`flex items-center space-x-3`}>
      <div className={`w-${size} h-${size} rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold`}>
        {initial}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-sm">{name || "-"}</span>
        {email && <span className="text-xs text-gray-500">{email}</span>}
      </div>
    </div>
  );
};

// Komponen Chip
const Chip = ({ children, colorConfig, className = "" }) => {
  const IconComponent = colorConfig?.icon;
  return (
    <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${colorConfig.bg} ${colorConfig.text} ${className}`}>
      {IconComponent && <IconComponent />}
      <span>{children}</span>
    </span>
  );
};

// Komponen RowSP
const RowSP = ({ r, zebra, onSelect, selected, msal, darkMode }) => {
  const f = r.fields;
  
  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`cursor-pointer transition-all duration-300 ${
        selected 
          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' 
          : zebra 
            ? (darkMode ? 'bg-gray-700/50 hover:bg-gray-600/50' : 'bg-gray-50 hover:bg-gray-100')
            : (darkMode ? 'bg-gray-800/50 hover:bg-gray-700/50' : 'bg-white hover:bg-gray-50')
      }`}
      onClick={onSelect}
    >
      <Td className="font-mono font-semibold">{f.TicketNumber || r.id}</Td>
      <Td>{fmtWaktu(f.DateReported)}</Td>
      <Td>{fmtWaktu(f.DateFinished)}</Td>
      <Td>
        <Avatar 
          name={f.UserRequestor?.displayName} 
          email={f.UserRequestor?.email} 
        />
      </Td>
      <Td>
        <Avatar 
          name={f.Assignedto0?.displayName || f.Issueloggedby} 
          email={f.Assignedto0?.email} 
        />
      </Td>
      <Td>
        <Chip colorConfig={DIVISI_COLORS[f.Divisi] || DIVISI_COLORS["Umum"]}>
          {f.Divisi}
        </Chip>
      </Td>
      <Td>
        <Chip colorConfig={PRIORITY_COLORS[f.Priority] || PRIORITY_COLORS["Normal"]}>
          {f.Priority}
        </Chip>
      </Td>
      <Td>
        <Chip colorConfig={STATUS_COLORS[f.Status] || STATUS_COLORS["Completed"]}>
          {f.Status}
        </Chip>
      </Td>
      <Td className={`max-w-[500px] ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
        <div className="line-clamp-3">{f.Description}</div>
      </Td>
      <Td className="text-center">
        {f.HasAttachments && (
          <FaPaperclip className={`mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        )}
      </Td>
    </motion.tr>
  );
};

// Komponen FormModal
const FormModal = ({ mode, data, onClose, onSubmit, onPickPhoto, onRemovePhoto, fileInputRef, photoPreview, darkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className={`rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${
          darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold">
              {mode === "create" ? "Tambah Ticket Baru" : "Edit Ticket"}
            </h2>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Form fields di sini */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Judul</label>
                <input
                  type="text"
                  name="Title"
                  defaultValue={data.Title}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Nomor Ticket</label>
                <input
                  type="text"
                  name="TicketNumber"
                  defaultValue={data.TicketNumber}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-800'
                  } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
            
            {/* Tambahkan field lainnya sesuai kebutuhan */}
            
            {/* Photo Upload Section */}
            <div>
              <label className="block text-sm font-medium mb-2">Foto Bukti</label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onPickPhoto}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-4 py-2 rounded-xl ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                  } text-white transition`}
                >
                  <FaCamera className="inline mr-2" />
                  Pilih Foto
                </button>
                {photoPreview && (
                  <button
                    type="button"
                    onClick={onRemovePhoto}
                    className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white transition"
                  >
                    <FaTimes className="inline mr-2" />
                    Hapus
                  </button>
                )}
              </div>
              {photoPreview && (
                <div className="mt-4">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="max-w-xs rounded-xl shadow-lg"
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl font-medium ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              } transition`}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition"
            >
              {mode === "create" ? "Simpan" : "Update"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Helper functions untuk upload attachment (jika diperlukan)
async function uploadAttachmentToSP(instance, accounts, itemId, file) {
  // Implementasi upload attachment
}

async function setDonePhotoMetaOnSP(instance, accounts, itemId, fileName) {
  // Implementasi set metadata photo
}