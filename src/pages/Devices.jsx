import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaDesktop, FaLaptop, FaServer, FaPrint, FaNetworkWired,
  FaMobile, FaTablet, FaCamera, FaHeadphones, FaKeyboard,
  FaMouse, FaSearch, FaFilter, FaSync, FaPlus, FaEdit,
  FaTrash, FaUpload, FaCheck, FaTimes, FaUser, FaUsers,
  FaShieldAlt, FaWindows, FaApple, FaLinux, FaBarcode,
  FaIdCard, FaBuilding, FaHistory, FaTools, FaCog,
  FaUserCircle, FaRedo
} from "react-icons/fa";

/** ====== KONFIG ====== */
const siteId = "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb";
const listId = "95880dbf-54dc-4bbb-a438-d6519941a409";
const REST_URL = "https://waskitainfra.sharepoint.com/sites/ITHELPDESK";
const GRAPH_SCOPE = ["Sites.ReadWrite.All"];
const SHAREPOINT_SCOPE = ["https://waskitainfra.sharepoint.com/.default"];
const PHOTO_FIELD_INTERNAL_NAME = "DevicePhoto";

// GlassCard Component yang lebih smooth
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

// Icon Chrome untuk Chrome OS
const FaChrome = (props) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C8.21 2.734 6.234 6.867 6.234 11.25c0 2.109.703 4.125 1.968 5.742l-3.376 5.86A11.91 11.91 0 010 12C0 5.373 5.373 0 12 0zm11.766 11.25c0-2.109-.703-4.125-1.968-5.742l3.376-5.86A11.91 11.91 0 0124 12c0 6.627-5.373 12-12 12 3.79-2.734 5.766-6.867 5.766-11.25z"/>
  </svg>
);

export default function Devices() {
  const { instance, accounts } = useMsal();
  const { dark: darkMode } = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [notif, setNotif] = useState("");
  const [filter, setFilter] = useState({ 
    Status: "", Type: "", Divisi: "", OS: "", Antivirus: "", AssetType: ""
  });
  const [modal, setModal] = useState({ open: false, mode: "", data: {} });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAnimation, setFilterAnimation] = useState(false);
  const fileInputRef = useRef(null);

  // Status mapping dengan warna
  const statusColors = {
    "DIPAKAI": { bg: "bg-blue-500", text: "text-blue-100", label: "Dipakai" },
    "SPARE": { bg: "bg-yellow-500", text: "text-yellow-100", label: "Spare" },
    "RUSAK": { bg: "bg-red-500", text: "text-red-100", label: "Rusak" },
    "HILANG": { bg: "bg-purple-500", text: "text-purple-100", label: "Hilang" },
    "TERSEDIA": { bg: "bg-green-500", text: "text-green-100", label: "Tersedia" },
    "PERBAIKAN": { bg: "bg-orange-500", text: "text-orange-100", label: "Perbaikan" }
  };

  // OS mapping dengan icon
  const osIcons = {
    "WINDOWS": { icon: FaWindows, color: "text-blue-500" },
    "MACOS": { icon: FaApple, color: "text-gray-800" },
    "LINUX": { icon: FaLinux, color: "text-yellow-500" },
    "CHROME OS": { icon: FaChrome, color: "text-green-500" },
    "WINDOWS 11 PRO": { icon: FaWindows, color: "text-blue-500" }
  };

  // Asset Type mapping dengan icon
  const assetTypeIcons = {
    "PC": FaDesktop, "LAPTOP": FaLaptop, "SERVER": FaServer, "PRINTER": FaPrint,
    "NETWORK": FaNetworkWired, "MOBILE": FaMobile, "TABLET": FaTablet,
    "CAMERA": FaCamera, "HEADPHONES": FaHeadphones, "KEYBOARD": FaKeyboard, "MOUSE": FaMouse
  };

  // Type mapping (Tipe Perangkat)
  const typeColors = {
    "ASET": { bg: "bg-blue-500", text: "text-blue-100" },
    "PRIBADI": { bg: "bg-green-500", text: "text-green-100" },
    "PERIPHERAL": { bg: "bg-purple-500", text: "text-purple-100" },
    "NETWORK": { bg: "bg-orange-500", text: "text-orange-100" },
    "SERVER": { bg: "bg-red-500", text: "text-red-100" }
  };

  /** ====== Deteksi ukuran layar ====== */
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /** ====== Field Mapping untuk tabel & form ====== */
  const FIELDS = useMemo(() => [
    { name: "Dokumentasi", key: "Foto_x0020_Peralang", mobile: true, icon: FaCamera },
    { name: "Nama PC / Laptop", key: "Title", mobile: true, icon: FaDesktop },
    { name: "Status Perangkat", key: "Status", mobile: true, icon: FaIdCard },
    { name: "Tipe Perangkat", key: "Type", mobile: true, icon: FaUserCircle },
    { name: "Jenis Hardware", key: "AssetType", mobile: true, icon: FaCog },
    { name: "Model", key: "Model", mobile: true, icon: FaLaptop },
    { name: "Spek PC / Laptop", key: "Manufacturer", mobile: false, icon: FaServer },
    { name: "OS", key: "Windows_x002f_Mac_x002f_Linux", mobile: true, icon: FaWindows },
    { name: "Departemen", key: "Divisi", mobile: true, icon: FaBuilding },
    { name: "Nomor Seri", key: "SerialNumber", mobile: true, icon: FaBarcode },
    { name: "User Saat Ini", key: "CurrentOwnerLookupId", mobile: true, icon: FaUser },
    { name: "User Sebelumnya", key: "PreviousOwner", mobile: false, icon: FaHistory },
    { name: "Antivirus", key: "AntiVirus", mobile: true, icon: FaShieldAlt },
  ], []);

  // Field yang ditampilkan di mobile
  const mobileFields = useMemo(() => FIELDS.filter(f => f.mobile), [FIELDS]);

  /** ====== Fetch data list ====== */
  useEffect(() => {
    if (accounts.length > 0) fetchData();
  }, [accounts.length]);

  async function fetchData() {
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items?expand=fields&$top=5000`, {
        headers: { Authorization: `Bearer ${token.accessToken}` }
      });
      const json = await res.json();
      setData(json.value || []);
      setSelectedRow(null);
    } catch (err) {
      setNotif("Gagal mengambil data: " + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  /** ====== Fetch nama user SP untuk CurrentOwnerLookupId ====== */
  useEffect(() => {
    if (!data || data.length === 0) return;
    const ids = Array.from(new Set(data.map((d) => d?.fields?.CurrentOwnerLookupId).filter((v) => v != null)));
    if (ids.length === 0) return;

    let alive = true;
    (async () => {
      try {
        const account = accounts[0];
        const token = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });
        const map = { ...userMap };

        for (const id of ids) {
          if (map[id]) continue;
          try {
            const r = await fetch(`${REST_URL}/_api/web/getuserbyid(${id})`, {
              headers: { Authorization: `Bearer ${token.accessToken}`, Accept: "application/json;odata=verbose" }
            });
            const t = await r.text();
            map[id] = r.ok ? (JSON.parse(t)?.d?.Title || JSON.parse(t)?.d?.Email || String(id)) : String(id);
          } catch { map[id] = String(id); }
        }
        if (alive) setUserMap(map);
      } catch (e) { console.warn("getuserbyid failed", e); }
    })();

    return () => { alive = false; };
  }, [data]);

  /** ====== Helpers filter & render ====== */
  const getUniqueOptions = (fieldKey) => [...new Set(data.map(item => item.fields?.[fieldKey]).filter(val => val))].sort();
  
  const getFiltered = () => {
    return data.filter(item => {
      const fields = item.fields || {};
      const matchesFilter = 
        (!filter.Status || fields.Status === filter.Status) &&
        (!filter.Type || fields.Type === filter.Type) &&
        (!filter.AssetType || fields.AssetType === filter.AssetType) &&
        (!filter.Divisi || fields.Divisi === filter.Divisi) &&
        (!filter.OS || fields.Windows_x002f_Mac_x002f_Linux === filter.OS) &&
        (!filter.Antivirus || (filter.Antivirus === "yes" ? fields.AntiVirus : !fields.AntiVirus));
      
      const matchesSearch = !searchTerm || 
        Object.values(fields).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      return matchesFilter && matchesSearch;
    });
  };

  const getPhotoUrl = (fields) => {
    try {
      let obj = fields?.[PHOTO_FIELD_INTERNAL_NAME];
      if (typeof obj === "string") obj = JSON.parse(obj);
      if (fields.Attachments && obj?.fileName && fields.id) {
        return `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      }
    } catch { return ""; }
  };

  const renderPhoto = (fields) => {
    const url = getPhotoUrl(fields);
    return (
      <motion.div 
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center overflow-hidden rounded-xl shadow-lg"
      >
        {url ? (
          <img src={url} alt="Device" className="w-full h-full object-cover" onError={(e) => {
            e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block';
          }} />
        ) : null}
        <FaCamera className="text-gray-400 dark:text-gray-500 text-lg" style={url ? {display: 'none'} : {}} />
      </motion.div>
    );
  };

  const renderPengguna = (fields) => {
    const id = fields?.CurrentOwnerLookupId;
    return id ? (userMap[id] || id) : "";
  };

  const renderStatusBadge = (status) => {
    const statusConfig = statusColors[status] || { bg: "bg-gray-500", text: "text-gray-100", label: status };
    return (
      <motion.span 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} shadow-md`}
      >
        {statusConfig.label}
      </motion.span>
    );
  };

  const renderTypeBadge = (type) => {
    const typeConfig = typeColors[type?.toUpperCase()] || { bg: "bg-gray-500", text: "text-gray-100" };
    return (
      <motion.span 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2 }}
        className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig.bg} ${typeConfig.text} shadow-md`}
      >
        {type || "Unknown"}
      </motion.span>
    );
  };

  const renderOSIcon = (os) => {
    const osConfig = osIcons[os?.toUpperCase()] || { icon: FaDesktop, color: "text-gray-500" };
    const IconComponent = osConfig.icon;
    return <IconComponent className={`text-lg ${osConfig.color}`} />;
  };

  const renderAssetTypeIcon = (assetType) => {
    const IconComponent = assetTypeIcons[assetType] || FaDesktop;
    return <IconComponent className="text-blue-500 text-lg" />;
  };

  /** ====== Reset Filter ====== */
  const resetFilter = () => {
    setFilter({ Status: "", Type: "", Divisi: "", OS: "", Antivirus: "", AssetType: "" });
    setSearchTerm("");
  };

  /** ====== Animasi Filter ====== */
  const handleFilterClick = () => {
    setFilterAnimation(true);
    setShowFilters(!showFilters);
    setTimeout(() => setFilterAnimation(false), 600);
  };

  /** ====== CRUD handlers ====== */
  const handleTambah = () => { resetPhoto(); setModal({ open: true, mode: "create", data: {} }); };
  const handleEdit = () => { if (!selectedRow) return; resetPhoto(); setModal({ open: true, mode: "edit", data: selectedRow.fields || {} }); };
  
  const handleDelete = async () => {
    if (!selectedRow || !window.confirm(`Yakin hapus device "${selectedRow.fields?.Title || ""}"?`)) return;
    setLoading(true);
    try {
      const account = accounts[0];
      const token = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
      const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token.accessToken}` }
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setNotif("Data berhasil dihapus!"); 
      await fetchData();
      setSelectedRow(null);
    } catch (e) { 
      console.error(e); 
      setNotif("Gagal menghapus data: " + e.message); 
    }
    finally { setLoading(false); }
  };

  /** ====== Build fields whitelist untuk Graph ====== */
  const buildFieldsFromForm = (formEl) => {
    const fd = new FormData(formEl);
    const allowed = [
      "Title", "Status", "Type", "AssetType", "Model", "Manufacturer", 
      "Windows_x002f_Mac_x002f_Linux", "Divisi", 
      "SerialNumber", "CurrentOwnerLookupId", "PreviousOwner", "AntiVirus"
    ];
    const out = {};
    
    for (const key of allowed) {
      if (fd.has(key)) out[key] = fd.get(key);
    }

    out.AntiVirus = fd.has("AntiVirus");

    if (out.CurrentOwnerLookupId) {
      const id = parseInt(out.CurrentOwnerLookupId, 10);
      if (!Number.isFinite(id)) throw new Error("Pengguna harus angka (SharePoint User ID).");
      out.CurrentOwnerLookupId = id;
    } else delete out.CurrentOwnerLookupId;

    Object.keys(out).forEach(k => { if (out[k] === "" || out[k] == null) delete out[k]; });
    return out;
  };

  /** ====== Upload attachment & set field foto ====== */
  const uploadAttachment = async (itemId, file) => {
    const account = accounts[0];
    const spTok = await instance.acquireTokenSilent({ scopes: SHAREPOINT_SCOPE, account });
    const fileName = file.name;
    const buf = await file.arrayBuffer();
    const upUrl = `${REST_URL}/_api/web/lists(guid'${listId}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(fileName)}')`;

    const res = await fetch(upUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${spTok.accessToken}`, Accept: "application/json;odata=verbose", "Content-Type": "application/octet-stream" },
      body: buf,
    });

    const text = await res.text();
    if (!res.ok) { console.error("Upload error:", text); throw new Error("Gagal upload lampiran"); }
    return { fileName };
  };

  const setPhotoField = async (itemId, saved) => {
    if (!saved?.fileName) return;
    const account = accounts[0];
    const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });
    const body = { [PHOTO_FIELD_INTERNAL_NAME]: JSON.stringify({ fileName: saved.fileName }) };

    const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${itemId}/fields`, {
      method: "PATCH", headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
    });

    if (!res.ok) { const t = await res.text(); console.warn("Set photo field failed:", t); }
  };

  /** ====== Submit create/edit ====== */
  const doCreateOrEdit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const fields = buildFieldsFromForm(e.currentTarget);
      const account = accounts[0];
      const gTok = await instance.acquireTokenSilent({ scopes: GRAPH_SCOPE, account });

      const readGraphError = async (res) => {
        let msg = `HTTP ${res.status}`;
        try { const t = await res.text(); const j = JSON.parse(t); msg = j?.error?.message || msg; } catch {}
        return msg;
      };

      if (modal.mode === "create") {
        const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`, {
          method: "POST", headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields })
        });
        if (!res.ok) throw new Error(await readGraphError(res));

        const created = await res.json();
        const newId = created?.id || created?.value?.[0]?.id;
        if (photoFile && newId) {
          const saved = await uploadAttachment(newId, photoFile);
          await setPhotoField(newId, saved);
        }
        setNotif("Data berhasil ditambahkan!");
      } else if (modal.mode === "edit" && selectedRow) {
        const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items/${selectedRow.id}`, {
          method: "PATCH", headers: { Authorization: `Bearer ${gTok.accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ fields })
        });
        if (!res.ok) throw new Error(await readGraphError(res));

        if (photoFile) {
          const saved = await uploadAttachment(selectedRow.id, photoFile);
          await setPhotoField(selectedRow.id, saved);
        }
        setNotif("Data berhasil diedit!");
      }

      setModal({ open: false, mode: "", data: {} }); resetPhoto(); await fetchData();
    } catch (err) { console.error(err); setNotif("Gagal simpan: " + err.message); }
    finally { setLoading(false); }
  };

  /** ====== Foto helpers ====== */
  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }
  };
  
  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const resetPhoto = () => { removePhoto(); };

  // Filtered data
  const filteredData = getFiltered();

  return (
    <div className={`min-h-screen py-6 transition-colors duration-300 ${darkMode ? 'dark bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-gray-100'}`}>
      
      {/* Notification */}
      <AnimatePresence>
        {notif && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl font-semibold transition-all duration-300 cursor-pointer ${darkMode ? 'bg-green-700' : 'bg-green-600'} text-white max-w-md text-center`}
            onClick={() => setNotif("")}
          >
            {notif}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
          >
            <DeviceModal 
              modal={modal}
              darkMode={darkMode}
              loading={loading}
              photoPreview={photoPreview}
              fileInputRef={fileInputRef}
              onPickPhoto={onPickPhoto}
              removePhoto={removePhoto}
              doCreateOrEdit={doCreateOrEdit}
              setModal={setModal}
              resetPhoto={resetPhoto}
              getUniqueOptions={getUniqueOptions}
              FIELDS={FIELDS}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Container utama - Lebar penuh dan lebih ke kiri */}
      <div className="w-full px-6 ml-0 mr-0">
        <GlassCard darkMode={darkMode} className="p-6">
          
          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4"
          >
            <div>
              <h1 className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`}>
                Manajemen Perangkat IT
              </h1>
              <p className={`mt-2 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Dokumentasi PC, Laptop, dan Perangkat IT Perusahaan
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`px-4 py-3 rounded-xl font-medium transition flex items-center space-x-2 ${darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                onClick={fetchData}
                disabled={loading}
              >
                <FaSync className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition flex items-center space-x-2"
                onClick={handleTambah}
              >
                <FaPlus />
                <span>Tambah Perangkat</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Search Bar */}
              <div className="flex-1">
                <div className={`relative rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-white'} shadow-lg`}>
                  <FaSearch className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    placeholder="Cari perangkat..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${darkMode ? 'bg-gray-700 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'}`}
                  />
                </div>
              </div>

              {/* Reset Filter Button */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={resetFilter}
                className={`px-4 py-3 rounded-xl font-medium flex items-center space-x-2 ${darkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'} shadow-lg`}
              >
                <FaRedo />
                <span>Reset Filter</span>
              </motion.button>

              {/* Filter Toggle untuk Mobile dengan animasi */}
              {isMobile && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={handleFilterClick}
                  className={`px-4 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } shadow-lg border ${darkMode ? 'border-blue-500' : 'border-blue-400'}`}
                  animate={{
                    scale: filterAnimation ? [1, 1.1, 1] : 1,
                    backgroundColor: showFilters 
                      ? darkMode ? "#1e40af" : "#1d4ed8" 
                      : darkMode ? "#2563eb" : "#3b82f6"
                  }}
                >
                  <motion.div
                    animate={{ rotate: showFilters ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FaFilter />
                  </motion.div>
                  <span>{showFilters ? "Sembunyikan" : "Filter"}</span>
                </motion.button>
              )}
            </div>

            {/* Filter Grid */}
            <AnimatePresence>
              {(showFilters || !isMobile) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 overflow-hidden"
                >
                  {[
                    { key: "Status", label: "Status", icon: FaIdCard },
                    { key: "Type", label: "Tipe Perangkat", icon: FaUserCircle },
                    { key: "AssetType", label: "Jenis Hardware", icon: FaCog },
                    { key: "Divisi", label: "Departemen", icon: FaBuilding },
                    { key: "Windows_x002f_Mac_x002f_Linux", label: "Sistem Operasi", icon: FaWindows },
                    { key: "Antivirus", label: "Antivirus", icon: FaShieldAlt },
                  ].map((filterItem, index) => (
                    <motion.div 
                      key={filterItem.key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                      className="flex flex-col"
                    >
                      <label className={`text-sm font-medium mb-2 flex items-center space-x-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        <filterItem.icon className="text-blue-500" />
                        <span>{filterItem.label}</span>
                      </label>
                      <select 
                        value={filter[filterItem.key]}
                        onChange={(e) => setFilter(f => ({ ...f, [filterItem.key]: e.target.value }))}
                        className={`px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'}`}
                      >
                        <option value="">Semua</option>
                        {filterItem.key === "Antivirus" ? (
                          <>
                            <option value="yes">Terpasang</option>
                            <option value="no">Tidak Terpasang</option>
                          </>
                        ) : (
                          getUniqueOptions(filterItem.key).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))
                        )}
                      </select>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Stats Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <StatCard 
              title="Total Perangkat"
              value={data.length}
              icon={FaDesktop}
              color="blue"
              darkMode={darkMode}
            />
            <StatCard 
              title="Sedang Dipakai"
              value={data.filter(d => d.fields?.Status === "DIPAKAI").length}
              icon={FaUser}
              color="green"
              darkMode={darkMode}
            />
            <StatCard 
              title="Perbaikan"
              value={data.filter(d => d.fields?.Status === "PERBAIKAN").length}
              icon={FaTools}
              color="orange"
              darkMode={darkMode}
            />
            <StatCard 
              title="Tersedia"
              value={data.filter(d => d.fields?.Status === "TERSEDIA").length}
              icon={FaCheck}
              color="purple"
              darkMode={darkMode}
            />
          </motion.div>

          {/* Data Display */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            {isMobile ? (
              // Mobile View
              <div className="space-y-4">
                {loading ? (
                  <LoadingState darkMode={darkMode} />
                ) : filteredData.length === 0 ? (
                  <EmptyState darkMode={darkMode} />
                ) : (
                  <>
                    {filteredData.map((item, index) => renderMobileCard(item, index))}
                    <div className={`text-center text-sm mt-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Menampilkan {filteredData.length} dari {data.length} perangkat
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Desktop Table View
              <DesktopTableView 
                filteredData={filteredData}
                loading={loading}
                data={data}
                darkMode={darkMode}
                selectedRow={selectedRow}
                setSelectedRow={setSelectedRow}
                handleEdit={handleEdit}
                handleDelete={handleDelete}
                FIELDS={FIELDS}
                renderPhoto={renderPhoto}
                renderPengguna={renderPengguna}
                renderStatusBadge={renderStatusBadge}
                renderTypeBadge={renderTypeBadge}
                renderOSIcon={renderOSIcon}
                renderAssetTypeIcon={renderAssetTypeIcon}
              />
            )}
          </motion.div>
        </GlassCard>
      </div>
    </div>
  );

  /** ====== Render untuk Mobile Card ====== */
  function renderMobileCard(item, index) {
    const fields = item.fields || {};
    const isSelected = selectedRow && selectedRow.id === item.id;
    
    return (
      <motion.div 
        key={item.id || index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={{ y: -2 }}
        className={`rounded-2xl p-4 mb-4 border-2 transition-all duration-300 ${
          isSelected 
            ? darkMode ? 'border-blue-500 bg-blue-900/20 shadow-lg' : 'border-blue-500 bg-blue-50 shadow-lg'
            : darkMode ? 'border-gray-700 bg-gray-800 shadow-md' : 'border-gray-200 bg-white shadow-md'
        }`}
        onClick={() => setSelectedRow(item)}
      >
        {/* Header dengan Foto dan Info Utama */}
        <div className="flex items-start space-x-4 mb-4">
          {renderPhoto(fields)}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-base truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {fields.Title || "No Name"}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  {renderAssetTypeIcon(fields.AssetType)}
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {fields.AssetType || "Unknown Type"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                {renderStatusBadge(fields.Status)}
                {fields.Type && renderTypeBadge(fields.Type)}
              </div>
            </div>
          </div>
        </div>

        {/* Detail Information Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div className="flex items-center space-x-2">
            <FaBarcode className="text-gray-400 text-xs" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Serial:</span>
            <span className={`ml-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{fields.SerialNumber || "-"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaBuilding className="text-gray-400 text-xs" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Dept:</span>
            <span className={`ml-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{fields.Divisi || "-"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaUser className="text-gray-400 text-xs" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>User:</span>
            <span className={`ml-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{renderPengguna(fields) || "-"}</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaShieldAlt className="text-gray-400 text-xs" />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>AV:</span>
            <span className={`ml-1 ${fields.AntiVirus ? 'text-green-500' : 'text-red-500'}`}>
              {fields.AntiVirus ? "✓" : "✗"}
            </span>
          </div>
        </div>

        {/* OS dan Spesifikasi */}
        <div className="space-y-2 mb-3">
          {fields.Windows_x002f_Mac_x002f_Linux && (
            <div className="flex items-center space-x-2">
              {renderOSIcon(fields.Windows_x002f_Mac_x002f_Linux)}
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {fields.Windows_x002f_Mac_x002f_Linux}
              </span>
            </div>
          )}
          {fields.Model && (
            <div>
              <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Model:</p>
              <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {fields.Model}
              </p>
            </div>
          )}
          {fields.Manufacturer && (
            <div>
              <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Spesifikasi:</p>
              <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-700'} line-clamp-2`}>
                {fields.Manufacturer}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isSelected && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.3 }}
            className="flex space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
              onClick={(e) => { e.stopPropagation(); handleEdit(); }}
            >
              <FaEdit className="text-sm" />
              <span>Edit</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 px-3 rounded-xl transition-colors flex items-center justify-center space-x-2"
              onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            >
              <FaTrash className="text-sm" />
              <span>Hapus</span>
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    );
  }
}

// Komponen Modal yang Dipisah
function DeviceModal({ modal, darkMode, loading, photoPreview, fileInputRef, onPickPhoto, removePhoto, doCreateOrEdit, setModal, resetPhoto, getUniqueOptions, FIELDS }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl p-6 w-full max-w-6xl shadow-2xl relative max-h-[95vh] overflow-y-auto ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}
    >
      <button 
        onClick={() => { setModal({ open: false, mode: "", data: {} }); resetPhoto(); }} 
        className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl"
      >
        <FaTimes />
      </button>

      <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        {modal.mode === "edit" ? "Edit" : "Tambah"} Perangkat
      </h3>

      <form onSubmit={doCreateOrEdit} className="space-y-6">
        {/* Photo Upload Section */}
        <div>
          <label className="block text-lg font-semibold mb-4">Dokumentasi Perangkat</label>
          <div className="flex items-center space-x-6">
            <motion.label 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${darkMode ? 'border-gray-600 hover:border-blue-500 text-gray-400' : 'border-gray-300 hover:border-blue-500 text-gray-500'}`}
            >
              <FaUpload className="h-8 w-8 mb-2" />
              <span className="text-sm">Upload foto</span>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
            </motion.label>
            
            {photoPreview ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <img src={photoPreview} alt="preview" className="h-32 w-32 object-cover rounded-2xl border-2 shadow-lg" />
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  transition={{ duration: 0.2 }}
                  type="button" 
                  onClick={removePhoto} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600"
                >
                  <FaTimes className="h-3 w-3" />
                </motion.button>
              </motion.div>
            ) : modal.data?.[PHOTO_FIELD_INTERNAL_NAME] ? (
              <OldPhotoPreview meta={modal.data[PHOTO_FIELD_INTERNAL_NAME]} fields={modal.data} darkMode={darkMode} />
            ) : null}
          </div>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: "Title", label: "Nama PC / Laptop", type: "text", required: true, icon: FaDesktop, placeholder: "Contoh: Laptop Dell XPS 13" },
            { name: "Type", label: "Tipe Perangkat", type: "select", options: ["ASET", "PRIBADI", "PERIPHERAL", "NETWORK", "SERVER"], icon: FaUserCircle },
            { name: "AssetType", label: "Jenis Hardware", type: "select", options: ["PC", "LAPTOP", "SERVER", "PRINTER", "NETWORK", "MOBILE", "TABLET", "CAMERA", "HEADPHONES", "KEYBOARD", "MOUSE"], icon: FaCog },
            { name: "Model", label: "Model Perangkat", type: "text", icon: FaLaptop, placeholder: "Contoh: PERSONAL COMPUTER (PC)" },
            { name: "Status", label: "Status Perangkat", type: "select", options: ["DIPAKAI", "TERSEDIA", "PERBAIKAN", "RUSAK", "SPARE", "HILANG"], icon: FaIdCard },
            { name: "Windows_x002f_Mac_x002f_Linux", label: "Sistem Operasi", type: "select", options: ["WINDOWS", "WINDOWS 11 PRO", "MACOS", "LINUX", "CHROME OS"], icon: FaWindows },
            { name: "Divisi", label: "Departemen", type: "select", options: getUniqueOptions("Divisi"), icon: FaBuilding },
            { name: "SerialNumber", label: "Nomor Seri Perangkat", type: "text", icon: FaBarcode, placeholder: "Masukkan nomor serial" },
            { name: "CurrentOwnerLookupId", label: "User Saat Ini (ID)", type: "number", icon: FaUser, placeholder: "ID user SharePoint" },
            { name: "PreviousOwner", label: "User Sebelumnya", type: "text", icon: FaHistory, placeholder: "Nama user sebelumnya" },
            { name: "Manufacturer", label: "Spek PC / Laptop", type: "textarea", icon: FaServer, placeholder: "Processor, RAM, Storage, dll." },
          ].map((field, index) => (
            <motion.div 
              key={field.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.1 }}
              className={field.type === "textarea" ? "md:col-span-2" : ""}
            >
              <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                <field.icon className="text-blue-500" />
                <span>{field.label}{field.required && " *"}</span>
              </label>
              
              {field.type === "select" ? (
                <select 
                  name={field.name}
                  defaultValue={modal.data?.[field.name] || ""}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'}`}
                >
                  <option value="">Pilih {field.label}</option>
                  {field.options?.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea 
                  name={field.name}
                  defaultValue={modal.data?.[field.name] || ""}
                  rows={3}
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'}`}
                />
              ) : (
                <input 
                  name={field.name}
                  type={field.type}
                  defaultValue={modal.data?.[field.name] || ""}
                  required={field.required}
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 text-gray-800'}`}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Antivirus Checkbox */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.8 }}
          className={`flex items-center space-x-3 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-purple-50'}`}
        >
          <div className="flex items-center h-5">
            <input 
              name="AntiVirus" 
              type="checkbox" 
              defaultChecked={!!modal.data?.AntiVirus} 
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" 
            />
          </div>
          <div className="flex items-center space-x-2">
            <FaShieldAlt className="text-green-500 text-lg" />
            <label className="text-lg font-semibold">Terpasang Antivirus</label>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <motion.button 
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`px-6 py-3 rounded-xl font-medium transition ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => { setModal({ open: false, mode: "", data: {} }); resetPhoto(); }}
          >
            Batal
          </motion.button>
          <motion.button 
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center space-x-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSync className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : modal.mode === "edit" ? (
              <>
                <FaEdit />
                <span>Simpan Perubahan</span>
              </>
            ) : (
              <>
                <FaPlus />
                <span>Tambah Perangkat</span>
              </>
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}

// Komponen Stat Card
function StatCard({ title, value, icon: Icon, color, darkMode }) {
  const colorClasses = {
    blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500' },
    green: { gradient: 'from-green-500 to-green-600', bg: 'bg-green-500' },
    orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-500' },
    purple: { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-500' },
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.05, y: -5 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl p-4 bg-gradient-to-r ${colorClasses[color].gradient} text-white shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color].bg} bg-white/20`}>
          <Icon className="text-2xl" />
        </div>
      </div>
    </motion.div>
  );
}

// Komponen Desktop Table View
function DesktopTableView({ filteredData, loading, data, darkMode, selectedRow, setSelectedRow, handleEdit, handleDelete, FIELDS, renderPhoto, renderPengguna, renderStatusBadge, renderTypeBadge, renderOSIcon, renderAssetTypeIcon }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              {FIELDS.map(field => (
                <th key={field.key} className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  <div className="flex items-center space-x-2">
                    <field.icon />
                    <span>{field.name}</span>
                  </div>
                </th>
              ))}
              <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
            {loading ? (
              <TableLoadingState colSpan={FIELDS.length + 1} darkMode={darkMode} />
            ) : filteredData.length === 0 ? (
              <TableEmptyState colSpan={FIELDS.length + 1} darkMode={darkMode} />
            ) : (
              filteredData.map((item, i) => (
                <TableRow 
                  key={item.id || i}
                  item={item}
                  fields={FIELDS}
                  darkMode={darkMode}
                  isSelected={selectedRow && selectedRow.id === item.id}
                  onSelect={setSelectedRow}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  renderPhoto={renderPhoto}
                  renderPengguna={renderPengguna}
                  renderStatusBadge={renderStatusBadge}
                  renderTypeBadge={renderTypeBadge}
                  renderOSIcon={renderOSIcon}
                  renderAssetTypeIcon={renderAssetTypeIcon}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && !loading && (
        <div className={`px-6 py-4 text-sm border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
          Menampilkan {filteredData.length} dari {data.length} perangkat
        </div>
      )}
    </div>
  );
}

// Komponen Table Row
function TableRow({ item, fields, darkMode, isSelected, onSelect, onEdit, onDelete, renderPhoto, renderPengguna, renderStatusBadge, renderTypeBadge, renderOSIcon, renderAssetTypeIcon }) {
  return (
    <motion.tr 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`hover:${darkMode ? 'bg-gray-700' : 'bg-gray-50'} cursor-pointer transition-colors ${
        isSelected ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50') : ''
      }`}
      onClick={() => onSelect(item)}
    >
      {fields.map(field => (
        <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm">
          {field.key === "Foto_x0020_Peralang" && renderPhoto(item.fields)}
          {field.key === "Title" && (
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {item.fields?.[field.key] || ""}
            </span>
          )}
          {field.key === "Status" && renderStatusBadge(item.fields?.Status)}
          {field.key === "Type" && renderTypeBadge(item.fields?.Type)}
          {field.key === "AssetType" && item.fields?.[field.key] && (
            <div className="flex items-center space-x-2">
              {renderAssetTypeIcon(item.fields?.[field.key])}
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{item.fields?.[field.key]}</span>
            </div>
          )}
          {field.key === "Windows_x002f_Mac_x002f_Linux" && item.fields?.[field.key] && (
            <div className="flex items-center space-x-2">
              {renderOSIcon(item.fields?.[field.key])}
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>{item.fields?.[field.key]}</span>
            </div>
          )}
          {field.key === "AntiVirus" && (
            <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
              item.fields?.AntiVirus ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {item.fields?.AntiVirus ? <FaCheck /> : <FaTimes />}
            </div>
          )}
          {field.key === "CurrentOwnerLookupId" && (
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {renderPengguna(item.fields)}
            </span>
          )}
          {!["Foto_x0020_Peralang", "Title", "Status", "Type", "AssetType", "Windows_x002f_Mac_x002f_Linux", "AntiVirus", "CurrentOwnerLookupId"].includes(field.key) && (
            <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              {item.fields?.[field.key] || "-"}
            </span>
          )}
        </td>
      ))}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        {isSelected && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="flex justify-end space-x-2"
          >
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`text-blue-600 hover:text-blue-800 px-4 py-2 rounded-lg transition ${
                darkMode ? 'bg-blue-900 text-blue-100 hover:bg-blue-800' : 'bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
            >
              <FaEdit />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`text-red-600 hover:text-red-800 px-4 py-2 rounded-lg transition ${
                darkMode ? 'bg-red-900 text-red-100 hover:bg-red-800' : 'bg-red-50 hover:bg-red-100'
              }`}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <FaTrash />
            </motion.button>
          </motion.div>
        )}
      </td>
    </motion.tr>
  );
}

// Komponen Loading State
function LoadingState({ darkMode }) {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"
        />
        <p className={`mt-4 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Memuat data perangkat...</p>
      </div>
    </div>
  );
}

function TableLoadingState({ colSpan, darkMode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <div className="flex justify-center items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="rounded-full h-8 w-8 border-b-2 border-blue-500"
          />
        </div>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Memuat data perangkat...</p>
      </td>
    </tr>
  );
}

// Komponen Empty State
function EmptyState({ darkMode }) {
  return (
    <div className="text-center py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        className="text-6xl mb-4"
      >
        🖥️
      </motion.div>
      <p className={`text-xl font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
        Data tidak ditemukan
      </p>
      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Coba ubah filter atau tambah data perangkat baru
      </p>
    </div>
  );
}

function TableEmptyState({ colSpan, darkMode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-12 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-4xl mb-4"
        >
          🖥️
        </motion.div>
        <p className={`text-lg font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
          Data tidak ditemukan
        </p>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Coba ubah filter atau tambah data perangkat baru
        </p>
      </td>
    </tr>
  );
}

/** Preview foto lama */
function OldPhotoPreview({ meta, fields, darkMode }) {
  try {
    let obj = meta;
    if (typeof obj === "string") obj = JSON.parse(obj);
    if (fields?.id && obj?.fileName) {
      const url = `${REST_URL}/Lists/Devices/Attachments/${fields.id}/${obj.fileName}`;
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <img src={url} alt="current" className="h-32 w-32 object-cover rounded-2xl border-2 shadow-lg" />
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-medium">Foto Saat Ini</span>
          </div>
        </motion.div>
      );
    }
  } catch {}
  return null;
}