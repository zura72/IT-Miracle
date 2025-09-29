// src/pages/helpdesk/TicketSolved.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { useMsal } from "@azure/msal-react";

// SharePoint Configuration
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const siteId = "waskitainfra-my.sharepoint.com,81711596-bf57-403c-8ef6-1cb25a538e52,43f60d09-3f38-4874-bf00-352549188508";
const listId = "467d78c3-7a1d-486f-8743-4a93c6b9ec91"; // Ganti dengan list ID untuk tickets

// API Functions - menggunakan fetch untuk berkomunikasi dengan server Railway
const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    console.log(`API Request: ${url}`, config);

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerChildren = {
  visible: { transition: { staggerChildren: 0.1 } }
};

const slideIn = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

// Component untuk menampilkan statistik
const StatCard = ({ title, value, color, darkMode, index }) => {
  const colorClasses = {
    blue: darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-100 text-blue-600",
    red: darkMode ? "bg-red-900/20 text-red-400" : "bg-red-100 text-red-600",
    orange: darkMode ? "bg-orange-900/20 text-orange-400" : "bg-orange-100 text-orange-600",
    green: darkMode ? "bg-green-900/20 text-green-400" : "bg-green-100 text-green-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`p-3 sm:p-4 rounded-xl ${colorClasses[color]} shadow-lg hover:shadow-xl transition-shadow duration-300`}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-lg sm:text-2xl font-bold">{value}</div>
      <div className="text-xs sm:text-sm opacity-80">{title}</div>
    </motion.div>
  );
};

// Component untuk menampilkan priority badge
const PriorityBadge = ({ priority, darkMode }) => {
  const priorityConfig = {
    urgent: { color: "red", icon: "🔥", text: "Urgent" },
    high: { color: "orange", icon: "⚠️", text: "High" },
    normal: { color: "blue", icon: "ℹ️", text: "Normal" },
    low: { color: "green", icon: "💤", text: "Low" },
  };

  const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.normal;
  
  const colorClasses = {
    red: darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800",
    orange: darkMode ? "bg-orange-900/30 text-orange-300" : "bg-orange-100 text-orange-800",
    blue: darkMode ? "bg-blue-900/30 text-blue-300" : "bg-blue-100 text-blue-800",
    green: darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800",
  };

  return (
    <motion.span 
      className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${colorClasses[config.color]}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      {config.icon} {config.text}
    </motion.span>
  );
};

// Component untuk status badge
const StatusBadge = ({ value = "", darkMode }) => {
  const v = String(value || "").toLowerCase();
  const style =
    v === "selesai"
      ? darkMode ? "bg-emerald-900/30 text-emerald-300" : "bg-emerald-100 text-emerald-800"
      : v === "belum"
      ? darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
      : darkMode ? "bg-yellow-900/30 text-yellow-300" : "bg-yellow-100 text-yellow-800";
  
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${style}`}>
      {value || "-"}
    </span>
  );
};

// Component untuk menampilkan lampiran foto - DIPERBARUI untuk dua lampiran
const AttachmentViewer = ({ 
  ticketEntryAttachment, 
  chatHostAttachment, 
  ticketNo, 
  darkMode 
}) => {
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [imageType, setImageType] = useState(""); // "ticketEntry" atau "chatHost"
  
  // Fungsi untuk mendapatkan URL gambar
  const getImageUrl = (photoData) => {
    if (!photoData) return null;
    
    if (typeof photoData === 'string') {
      if (photoData.startsWith('http')) {
        return photoData;
      } else if (photoData.startsWith('/')) {
        const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
        return `${baseUrl}${photoData}`;
      }
    }
    
    if (typeof photoData === 'object' && photoData !== null) {
      if (photoData.data && photoData.contentType) {
        return `data:${photoData.contentType};base64,${photoData.data}`;
      }
      
      const possibleBase64Fields = ['base64', 'buffer', 'file', 'image'];
      for (const field of possibleBase64Fields) {
        if (photoData[field] && typeof photoData[field] === 'string') {
          const contentType = photoData.contentType || photoData.type || 'image/jpeg';
          return `data:${contentType};base64,${photoData[field]}`;
        }
      }
    }
    
    return null;
  };

  const ticketEntryUrl = getImageUrl(ticketEntryAttachment);
  const chatHostUrl = getImageUrl(chatHostAttachment);

  // Buka modal dengan gambar tertentu
  const openImageModal = (imageUrl, type) => {
    setCurrentImage(imageUrl);
    setImageType(type);
    setShowImageModal(true);
  };

  // Jika tidak ada lampiran sama sekali
  if (!ticketEntryUrl && !chatHostUrl) {
    return (
      <span className="text-gray-500 text-sm">Tidak ada lampiran</span>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Lampiran dari TicketEntry */}
        {ticketEntryUrl && (
          <motion.button
            onClick={() => openImageModal(ticketEntryUrl, "ticketEntry")}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              darkMode ? "bg-blue-900/30 hover:bg-blue-900/50" : "bg-blue-100 hover:bg-blue-200"
            } transition-colors`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>📷</span>
            <span className="text-sm">Lampiran User</span>
          </motion.button>
        )}
        
        {/* Lampiran dari ChatHost */}
        {chatHostUrl && (
          <motion.button
            onClick={() => openImageModal(chatHostUrl, "chatHost")}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              darkMode ? "bg-green-900/30 hover:bg-green-900/50" : "bg-green-100 hover:bg-green-200"
            } transition-colors`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span>🖼️</span>
            <span className="text-sm">Lampiran IT</span>
          </motion.button>
        )}
      </div>

      {/* Modal untuk menampilkan gambar */}
      <AnimatePresence>
        {showImageModal && currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setShowImageModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-t-lg flex justify-between items-center`}>
                <div>
                  <h3 className="font-semibold">
                    Lampiran {imageType === "ticketEntry" ? "User" : "IT"} - Ticket {ticketNo}
                  </h3>
                  <p className="text-sm opacity-70">
                    {imageType === "ticketEntry" ? "Dari TicketEntry (User)" : "Dari ChatHost (IT)"}
                  </p>
                </div>
                <motion.button 
                  onClick={() => setShowImageModal(false)}
                  className="text-2xl hover:opacity-70"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>
              <div className="bg-black flex items-center justify-center p-4 rounded-b-lg">
                <img 
                  src={currentImage} 
                  alt={`Lampiran ${imageType === "ticketEntry" ? "User" : "IT"} ticket ${ticketNo}`}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    console.error('Gagal memuat gambar:', currentImage);
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HYWdhbCBtdW5jdWwgbWVtdWF0IGdhbWJhcjwvdGV4dD48L3N2Zz4=";
                  }}
                />
              </div>
              <div className="flex justify-center mt-2 gap-2">
                <a 
                  href={currentImage} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-lg ${
                    darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm`}
                >
                  Buka di Tab Baru
                </a>
                {/* Tombol untuk melihat lampiran lainnya jika ada */}
                {ticketEntryUrl && chatHostUrl && (
                  <motion.button
                    onClick={() => {
                      const otherImage = imageType === "ticketEntry" ? chatHostUrl : ticketEntryUrl;
                      const otherType = imageType === "ticketEntry" ? "chatHost" : "ticketEntry";
                      openImageModal(otherImage, otherType);
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      darkMode ? "bg-gray-600 hover:bg-gray-700" : "bg-gray-500 hover:bg-gray-600"
                    } text-white text-sm`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Lihat {imageType === "ticketEntry" ? "Lampiran IT" : "Lampiran User"}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ===================== Divisi ===================== */
const DIVISI_OPTIONS = [
  "IT & System","Business Development","Direksi","Engineering","Finance & Accounting",
  "Human Capital","Legal","Marketing & Sales","Operation & Maintenance",
  "Procurement & Logistic","Project","QHSE","Sekper","Warehouse","Umum",
];

/* ===================== Utils ===================== */
const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
function fmtWaktu(s){
  try {
    return new Date(s).toLocaleString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
  } catch { return s || "-"; }
}

/* ===================== Component ===================== */
export default function TicketSolved(){
  const { instance, accounts } = useMsal();
  
  // Staging state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState({ Divisi:"", Priority:"", Status:"" });
  const { dark: darkMode } = useTheme();

  // State untuk CRUD lokal
  const [editingTicket, setEditingTicket] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [localTickets, setLocalTickets] = useState({}); // Untuk menyimpan perubahan lokal

  // State untuk SharePoint
  const [sharePointModal, setSharePointModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Stats calculation
  const stats = {
    total: rows.length,
    selesai: rows.filter(t => (t.status || "").toLowerCase() === "selesai").length,
    belum: rows.filter(t => (t.status || "").toLowerCase() === "belum").length,
    ditolak: rows.filter(t => (t.status || "").toLowerCase() === "ditolak").length,
  };

  /* ====== Effects ====== */
  useEffect(() => {
    loadTickets();
  }, []);

  /* ===================== LOAD TICKETS ===================== */
  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      
      const data = await apiRequest("/api/tickets?status=Selesai");
      
      console.log("Data received from server:", data);
      
      const formattedTickets = (data.rows || []).map(ticket => ({
        id: ticket._id || ticket.id,
        ticketNo: ticket.ticketNo,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        user: ticket.name,
        department: ticket.division,
        priority: ticket.priority || "Normal",
        description: ticket.description,
        assignee: ticket.assignee || "",
        // DUA LAMPIRAN: dari TicketEntry dan ChatHost
        ticketEntryAttachment: ticket.photo, // Lampiran dari TicketEntry (User)
        chatHostAttachment: ticket.chatPhoto || ticket.solutionPhoto, // Lampiran dari ChatHost (IT)
        status: ticket.status,
        notes: ticket.notes,
        operator: ticket.operator,
        addedToSharePoint: false // Flag untuk menandai sudah ditambahkan ke SharePoint
      }));
      
      setRows(formattedTickets);
    } catch (err) {
      console.error("Error loading tickets:", err);
      setError("Gagal memuat tiket: " + (err.message || "Koneksi ke server gagal"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===================== CRUD LOKAL ===================== */
  
  // Edit ticket lokal
  const handleEdit = (ticket) => {
    setEditingTicket(ticket);
    setShowEditModal(true);
  };

  // Update ticket lokal
  const handleUpdate = (updatedData) => {
    setRows(prev => prev.map(ticket => 
      ticket.id === editingTicket.id 
        ? { ...ticket, ...updatedData, updatedAt: new Date().toISOString() }
        : ticket
    ));
    
    // Simpan ke state lokal
    setLocalTickets(prev => ({
      ...prev,
      [editingTicket.id]: { ...editingTicket, ...updatedData }
    }));
    
    setShowEditModal(false);
    setEditingTicket(null);
    setSuccess("Data berhasil diupdate secara lokal");
  };

  // Delete ticket lokal
  const handleDelete = (ticket) => {
    if (!window.confirm(`Hapus ticket "${ticket.ticketNo}" dari tampilan?`)) return;
    
    setRows(prev => prev.filter(t => t.id !== ticket.id));
    setSuccess("Data berhasil dihapus dari tampilan");
  };

  /* ===================== SHAREPOINT FUNCTIONS ===================== */
  
  // Buka modal konfirmasi SharePoint
  const openSharePointModal = (ticket) => {
    setSelectedTicket(ticket);
    setSharePointModal(true);
  };

  // Tambahkan ke SharePoint
  const addToSharePoint = async () => {
    if (!selectedTicket) return;
    
    try {
      const account = accounts[0];
      if (!account) {
        setError("Silakan login dengan Microsoft terlebih dahulu");
        setSharePointModal(false);
        return;
      }

      const token = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPE,
        account,
      });

      const body = {
        fields: {
          Title: selectedTicket.ticketNo,
          User: selectedTicket.user,
          Department: selectedTicket.department,
          Priority: selectedTicket.priority,
          Description: selectedTicket.description,
          Assignee: selectedTicket.assignee,
          Status: selectedTicket.status,
          Notes: selectedTicket.notes,
          Operator: selectedTicket.operator,
          CreatedDate: selectedTicket.createdAt,
          UpdatedDate: selectedTicket.updatedAt,
          Source: "TicketEntry System",
          // Tambahkan informasi tentang lampiran
          HasTicketEntryAttachment: !!selectedTicket.ticketEntryAttachment,
          HasChatHostAttachment: !!selectedTicket.chatHostAttachment,
        },
      };

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error("Gagal menambah data ke SharePoint: " + errText);
      }
      
      // Tandai ticket sudah ditambahkan ke SharePoint
      setRows(prev => prev.map(ticket => 
        ticket.id === selectedTicket.id 
          ? { ...ticket, addedToSharePoint: true }
          : ticket
      ));
      
      setSuccess("Data berhasil ditambahkan ke SharePoint");
      setSharePointModal(false);
      setSelectedTicket(null);
    } catch (err) {
      setError("Gagal menambah data ke SharePoint: " + err.message);
      setSharePointModal(false);
    }
  };

  /* ===================== PRINT ===================== */
  function handlePrint(){
    const items = filtered;
    const head = `
      <meta charset="utf-8"/>
      <title>Ticket Solved</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font: 12px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; color:#000; }
        h1 { margin:0 0 8px; font-size:18px; }
        table { width:100%; border-collapse:collapse; border:1.5pt solid #000; }
        th,td { border:0.9pt solid #000; padding:6px 8px; vertical-align:top; }
        thead th { background:#f3f4f6; text-align:left; }
      </style>
    `;
    const body = items.map(r=>`
      <tr>
        <td>${esc(r.ticketNo)}</td>
        <td>${esc(fmtWaktu(r.createdAt))}</td>
        <td>${esc(fmtWaktu(r.updatedAt))}</td>
        <td>${esc(r.user)}</td>
        <td>${esc(r.assignee)}</td>
        <td>${esc(r.department)}</td>
        <td>${esc(r.priority)}</td>
        <td>${esc(r.status)}</td>
        <td>${esc(r.description)}</td>
      </tr>
    `).join("");
    const html = `<!doctype html><html><head>${head}</head><body>
      <h1>Ticket Solved</h1>
      <table>
        <thead><tr>
          <th>No. Ticket</th><th>Waktu Lapor</th><th>Waktu Selesai</th><th>User</th><th>Assignee</th>
          <th>Divisi</th><th>Prioritas</th><th>Status</th><th>Deskripsi</th>
        </tr></thead><tbody>${body}</tbody></table>
      <script>onload=()=>{print();setTimeout(()=>close(),300)}</script>
    </body></html>`;
    const w = window.open("", "_blank", "noopener,noreferrer");
    w.document.open(); w.document.write(html); w.document.close();
  }

  /* ====== Derived ====== */
  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    return rows
      .filter(r=>{
        if (filter.Status && (r.status||"").toLowerCase() !== filter.Status.toLowerCase()) return false;
        if (filter.Divisi && (r.department||"") !== filter.Divisi) return false;
        if (filter.Priority && (r.priority||"").toLowerCase() !== filter.Priority.toLowerCase()) return false;
        if (!s) return true;
        return [
          r.ticketNo, r.user, r.assignee, r.department, r.priority, r.description,
          r.status, r.notes
        ].join(" ").toLowerCase().includes(s);
      })
      .sort((a,b)=>{
        const tA = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
        const tB = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
        return tB - tA;
      });
  }, [rows, q, filter]);

  /* ===================== RENDER ===================== */
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen p-3 sm:p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`mb-6 p-3 sm:p-4 rounded-xl ${
              darkMode ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"
            } border`}
          >
            <div className="flex justify-between items-center text-sm sm:text-base">
              <span>❌ {error}</span>
              <button onClick={() => setError("")} className="text-sm underline">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`mb-6 p-3 sm:p-4 rounded-xl ${
              darkMode ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"
            } border`}
          >
            <div className="flex justify-between items-center text-sm sm:text-base">
              <span>✅ {success}</span>
              <button onClick={() => setSuccess("")} className="text-sm underline">Tutup</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl p-4 sm:p-6 mb-6 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <motion.div variants={slideIn}>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              Ticket Solved
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Data ini berasal dari TicketEntry yang telah dikerjakan oleh pelaksana tim IT
            </p>
          </motion.div>
          
          <motion.div 
            className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total" value={stats.total} color="blue" darkMode={darkMode} index={0} />
            <StatCard title="Selesai" value={stats.selesai} color="green" darkMode={darkMode} index={1} />
            <StatCard title="Ditolak" value={stats.ditolak} color="red" darkMode={darkMode} index={2} />
          </motion.div>
        </div>

        {/* Search and Actions */}
        <motion.div 
          className="flex flex-col gap-4"
          variants={fadeIn}
        >
          <div className="flex-1">
            <motion.div 
              className="relative"
              whileFocus={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <input
                type="text"
                placeholder="Cari tiket berdasarkan nomor, nama, divisi, atau deskripsi..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${
                  darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
                } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-sm sm:text-base`}
              />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </motion.div>
          </div>
          
          <motion.div 
            className="flex gap-2 flex-wrap"
            variants={staggerChildren}
          >
            <select 
              className={`px-3 py-2 rounded-xl border text-sm ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Divisi} 
              onChange={(e)=>setFilter(f=>({...f,Divisi:e.target.value}))}
            >
              <option value="">All Divisi</option>
              {DIVISI_OPTIONS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
            
            <select 
              className={`px-3 py-2 rounded-xl border text-sm ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Priority} 
              onChange={(e)=>setFilter(f=>({...f,Priority:e.target.value}))}
            >
              <option value="">All Prioritas</option>
              {["Low","Normal","High","Urgent"].map(p=><option key={p} value={p}>{p}</option>)}
            </select>
            
            <select 
              className={`px-3 py-2 rounded-xl border text-sm ${
                darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"
              } focus:ring-2 focus:ring-blue-500`}
              value={filter.Status} 
              onChange={(e)=>setFilter(f=>({...f,Status:e.target.value}))}
            >
              <option value="">All Status</option>
              {["Selesai","Belum","Ditolak"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            
            <motion.button
              onClick={loadTickets}
              disabled={loading}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium flex items-center gap-2 text-sm sm:text-base ${
                loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? "⏳" : "🔄"} {loading ? "Loading..." : "Refresh"}
            </motion.button>
            
            <motion.button
              onClick={handlePrint}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border text-sm sm:text-base ${
                darkMode ? "border-gray-600 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"
              } flex items-center gap-2`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              🖨️ Print
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Tickets Table */}
      <motion.div 
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className={`rounded-2xl overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                <th className="p-4 text-left">Ticket #</th>
                <th className="p-4 text-left">Waktu Lapor</th>
                <th className="p-4 text-left">Waktu Selesai</th>
                <th className="p-4 text-left">User</th>
                <th className="p-4 text-left">Assignee</th>
                <th className="p-4 text-left">Divisi</th>
                <th className="p-4 text-left">Prioritas</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Deskripsi</th>
                <th className="p-4 text-left">Lampiran</th>
                <th className="p-4 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                    />
                    <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Memuat tiket...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className={`p-8 text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {q ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket yang sudah diselesaikan"}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filtered.map((ticket, i) => (
                    <motion.tr 
                      key={ticket.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className={i % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}
                      whileHover={{ backgroundColor: darkMode ? "rgba(55, 65, 81, 0.5)" : "rgba(243, 244, 246, 0.5)" }}
                    >
                      <td className="p-4 font-mono font-bold">
                        <div className="flex items-center gap-2">
                          {ticket.ticketNo}
                          {ticket.addedToSharePoint && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded" title="Sudah ditambahkan ke SharePoint">
                              ✓
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{fmtWaktu(ticket.createdAt)}</td>
                      <td className="p-4">{fmtWaktu(ticket.updatedAt)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-sm font-semibold shadow">
                            {String(ticket.user || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {ticket.user || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white flex items-center justify-center text-sm font-semibold shadow">
                            {String(ticket.assignee || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className={`font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {ticket.assignee || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                          darkMode ? "bg-gray-700 text-gray-300 border-gray-600" : "bg-gray-100 text-gray-700 border-gray-200"
                        } border`}>
                          {ticket.department || "-"}
                        </span>
                      </td>
                      <td className="p-4">
                        <PriorityBadge priority={ticket.priority} darkMode={darkMode} />
                      </td>
                      <td className="p-4">
                        <StatusBadge value={ticket.status || ""} darkMode={darkMode} />
                      </td>
                      <td className="p-4 max-w-xs">
                        <div className={`whitespace-pre-wrap ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          {ticket.description || "-"}
                        </div>
                      </td>
                      <td className="p-4">
                        {/* KOMPONEN LAMPIRAN DIPERBARUI - MENAMPILKAN DUA LAMPIRAN */}
                        <AttachmentViewer 
                          ticketEntryAttachment={ticket.ticketEntryAttachment}
                          chatHostAttachment={ticket.chatHostAttachment}
                          ticketNo={ticket.ticketNo}
                          darkMode={darkMode}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {/* Tombol Edit (CRUD Lokal) */}
                          <motion.button
                            onClick={() => handleEdit(ticket)}
                            className={`px-3 py-1 rounded text-xs ${
                              darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                            } text-white`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Edit
                          </motion.button>
                          
                          {/* Tombol Hapus (CRUD Lokal) */}
                          <motion.button
                            onClick={() => handleDelete(ticket)}
                            className={`px-3 py-1 rounded text-xs ${
                              darkMode ? "bg-red-600 hover:bg-red-700" : "bg-red-500 hover:bg-red-600"
                            } text-white`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Hapus
                          </motion.button>
                          
                          {/* Tombol Tambah ke SharePoint */}
                          {!ticket.addedToSharePoint && (
                            <motion.button
                              onClick={() => openSharePointModal(ticket)}
                              className={`px-3 py-1 rounded text-xs ${
                                darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600"
                              } text-white`}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              + SharePoint
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal Edit (CRUD Lokal) */}
      {showEditModal && editingTicket && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-2 sm:p-4">
          <div 
            className={`rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 md:p-6 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <h2 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-300">
                Edit Data Ticket
              </h2>
            </div>
            
            <EditTicketForm 
              ticket={editingTicket}
              onSave={handleUpdate}
              onCancel={() => setShowEditModal(false)}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      {/* Modal Konfirmasi SharePoint */}
      {sharePointModal && selectedTicket && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-2 sm:p-4">
          <div 
            className={`rounded-xl shadow-2xl w-full max-w-2xl ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 md:p-6 border-b ${
              darkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <h2 className="text-lg md:text-xl font-bold text-blue-700 dark:text-blue-300">
                Tambahkan ke SharePoint
              </h2>
            </div>
            
            <div className="p-4 md:p-6">
              <p className="mb-4 text-sm md:text-base">
                Apakah Anda yakin ingin menambahkan ticket berikut ke SharePoint?
              </p>
              
              <div className={`p-4 rounded-lg mb-6 ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}>
                <h3 className="font-bold mb-2">Detail Ticket:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>No. Ticket:</strong> {selectedTicket.ticketNo}</div>
                  <div><strong>User:</strong> {selectedTicket.user}</div>
                  <div><strong>Divisi:</strong> {selectedTicket.department}</div>
                  <div><strong>Prioritas:</strong> {selectedTicket.priority}</div>
                  <div><strong>Status:</strong> {selectedTicket.status}</div>
                  <div><strong>Assignee:</strong> {selectedTicket.assignee || "-"}</div>
                  <div><strong>Lampiran User:</strong> {selectedTicket.ticketEntryAttachment ? "✅ Ada" : "❌ Tidak ada"}</div>
                  <div><strong>Lampiran IT:</strong> {selectedTicket.chatHostAttachment ? "✅ Ada" : "❌ Tidak ada"}</div>
                </div>
                <div className="mt-2">
                  <strong>Deskripsi:</strong> 
                  <p className="text-sm mt-1">{selectedTicket.description}</p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSharePointModal(false)}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm md:text-base"
                >
                  Batal
                </button>
                <button
                  onClick={addToSharePoint}
                  className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center text-sm md:text-base"
                >
                  Ya, Tambahkan ke SharePoint
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Component Form untuk Edit Ticket (CRUD Lokal)
const EditTicketForm = ({ ticket, onSave, onCancel, darkMode }) => {
  const [formData, setFormData] = useState({
    user: ticket.user || "",
    department: ticket.department || "",
    priority: ticket.priority || "Normal",
    description: ticket.description || "",
    assignee: ticket.assignee || "",
    status: ticket.status || "Selesai",
    notes: ticket.notes || "",
    operator: ticket.operator || ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User *
          </label>
          <input
            type="text"
            name="user"
            value={formData.user}
            onChange={handleChange}
            required
            className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Divisi *
          </label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
          >
            <option value="">-- Pilih Divisi --</option>
            {DIVISI_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prioritas *
          </label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            required
            className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
          >
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assignee
          </label>
          <input
            type="text"
            name="assignee"
            value={formData.assignee}
            onChange={handleChange}
            className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Deskripsi *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={3}
          className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Catatan
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Operator
        </label>
        <input
          type="text"
          name="operator"
          value={formData.operator}
          onChange={handleChange}
          className="w-full p-2.5 md:p-3 rounded-lg border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm md:text-base"
        />
      </div>
      
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm md:text-base"
        >
          Batal
        </button>
        <button
          type="submit"
          className="px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm md:text-base"
        >
          Simpan Perubahan
        </button>
      </div>
    </form>
  );
};