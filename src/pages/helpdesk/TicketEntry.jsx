import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

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

    // Jika ada body, stringify jika belum string
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

// Konfigurasi SharePoint
const SHAREPOINT_CONFIG = {
  siteId: "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb",
  listId: "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912",
  restUrl: "https://waskitainfra.sharepoint.com/sites/ITHELPDESK",
  graphScopes: ["Sites.ReadWrite.All"],
  sharepointScopes: ["https://waskitainfra.sharepoint.com/.default"],
  donePhotoField: "ScreenshotBuktiTicketsudahDilaku"
};

// Fungsi helper untuk SharePoint
const sharePointAPI = {
  // Create item di SharePoint
  createItem: async (instance, accounts, fields) => {
    const account = accounts?.[0];
    const token = await instance.acquireTokenSilent({ 
      scopes: SHAREPOINT_CONFIG.graphScopes, 
      account 
    });

    const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteId}/lists/${SHAREPOINT_CONFIG.listId}/items`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SharePoint API error: ${errorText}`);
    }

    return await response.json();
  },

  // Upload attachment ke SharePoint
  uploadAttachment: async (instance, accounts, itemId, file) => {
    const account = accounts?.[0];
    const token = await instance.acquireTokenSilent({ 
      scopes: SHAREPOINT_CONFIG.sharepointScopes, 
      account 
    });

    const buffer = await file.arrayBuffer();
    const uploadUrl = `${SHAREPOINT_CONFIG.restUrl}/_api/web/lists(guid'${SHAREPOINT_CONFIG.listId}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(file.name)}')`;
    
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        Accept: "application/json;odata=verbose",
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Attachment upload failed: ${errorText}`);
    }

    return { fileName: file.name };
  },

  // Update field di SharePoint
  updateField: async (instance, accounts, itemId, fields) => {
    const account = accounts?.[0];
    const token = await instance.acquireTokenSilent({ 
      scopes: SHAREPOINT_CONFIG.graphScopes, 
      account 
    });

    const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteId}/lists/${SHAREPOINT_CONFIG.listId}/items/${itemId}/fields`;
    
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Field update failed: ${errorText}`);
    }

    return await response.json();
  }
};

// Fungsi untuk memformat data ticket ke format SharePoint
const formatTicketForSharePoint = (ticket, notes, userName, filePath = null) => {
  // Map priority dari format aplikasi ke format SharePoint
  const priorityMap = {
    'urgent': 'High',
    'high': 'High', 
    'normal': 'Normal',
    'low': 'Low'
  };

  // Map department/divisi
  const departmentMap = {
    'IT': 'IT & System',
    'HR': 'Human Capital',
    'Finance': 'Finance & Accounting',
    'Engineering': 'Engineering',
    'Marketing': 'Marketing & Sales',
    'Operation': 'Operation & Maintenance',
    'Procurement': 'Procurement & Logistic',
    'Project': 'Project',
    'QHSE': 'QHSE',
    'Warehouse': 'Warehouse',
    // Tambahkan mapping lainnya sesuai kebutuhan
  };

  const fields = {
    Title: ticket.description ? String(ticket.description).slice(0, 120) : `Ticket ${ticket.ticketNo}`,
    TicketNumber: ticket.ticketNo || "",
    Description: ticket.description || "",
    Priority: priorityMap[ticket.priority?.toLowerCase()] || "Normal",
    Status: "Selesai",
    Divisi: departmentMap[ticket.department] || ticket.department || "Umum",
    DateReported: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
    DateFinished: new Date().toISOString(),
    TipeTicket: "IT Support",
    Assignedto0: userName || "IT Team",
    Issueloggedby: userName || "IT Team",
    ResolutionNotes: notes || "",
    UserRequestor: ticket.user || "",
  };

  // Jika ada file path, tambahkan ke metadata
  if (filePath) {
    fields[SHAREPOINT_CONFIG.donePhotoField] = filePath;
  }

  return fields;
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

// Component untuk modal
const Modal = ({ title, children, onClose, darkMode }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className={`rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"} shadow-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`p-4 sm:p-6 border-b ${darkMode ? "border-gray-700" : "border-gray-200"} flex justify-between items-center sticky top-0 ${darkMode ? "bg-gray-800" : "bg-white"} z-10`}>
        <h3 className="text-lg sm:text-xl font-semibold">{title}</h3>
        <motion.button 
          onClick={onClose} 
          className="text-2xl hover:opacity-70"
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          ×
        </motion.button>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </motion.div>
  </motion.div>
);

// Component untuk menampilkan lampiran foto - DIPERBAIKI UNTUK HANDLE BASE64 OBJECT
const AttachmentViewer = ({ attachment, ticketNo, darkMode }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  
  // Fungsi untuk mendapatkan URL gambar yang lengkap - DIPERBAIKI
  const getImageUrl = (photoData) => {
    if (!photoData) return null;
    
    console.log('Processing photo data:', photoData);
    
    // Format 1: String URL (future implementation)
    if (typeof photoData === 'string') {
      if (photoData.startsWith('http')) {
        return photoData; // URL lengkap
      } else if (photoData.startsWith('/')) {
        // Path relatif
        const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
        return `${baseUrl}${photoData}`;
      }
    }
    
    // Format 2: Object base64 (current implementation)
    if (typeof photoData === 'object' && photoData !== null) {
      // Cek jika ada data base64 dan contentType
      if (photoData.data && photoData.contentType) {
        const dataUri = `data:${photoData.contentType};base64,${photoData.data}`;
        console.log('Generated data URI from base64 object');
        return dataUri;
      }
      
      // Cek properti lain yang mungkin berisi base64 data
      const possibleBase64Fields = ['base64', 'buffer', 'file', 'image'];
      for (const field of possibleBase64Fields) {
        if (photoData[field] && typeof photoData[field] === 'string') {
          const contentType = photoData.contentType || photoData.type || 'image/jpeg';
          const dataUri = `data:${contentType};base64,${photoData[field]}`;
          console.log('Generated data URI from', field);
          return dataUri;
        }
      }
      
      // Cek jika ada path/URL dalam object
      const possiblePathFields = ['path', 'url', 'filename', 'photo'];
      for (const field of possiblePathFields) {
        if (photoData[field] && typeof photoData[field] === 'string') {
          if (photoData[field].startsWith('http')) {
            return photoData[field];
          } else if (photoData[field].startsWith('/')) {
            const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
            return `${baseUrl}${photoData[field]}`;
          }
        }
      }
    }
    
    console.log('No valid image data found');
    return null;
  };

  const imageUrl = getImageUrl(attachment);

  // Jika tidak ada URL yang valid
  if (!imageUrl) {
    return (
      <span className="text-gray-500 text-sm">Tidak ada lampiran</span>
    );
  }

  return (
    <>
      <motion.button
        onClick={() => setShowImageModal(true)}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
          darkMode ? "bg-blue-900/30 hover:bg-blue-900/50" : "bg-blue-100 hover:bg-blue-200"
        } transition-colors`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>📎</span>
        <span className="text-sm">Lihat Foto</span>
      </motion.button>

      <AnimatePresence>
        {showImageModal && (
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
                <h3 className="font-semibold">Lampiran Ticket {ticketNo}</h3>
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
                  src={imageUrl} 
                  alt={`Lampiran ticket ${ticketNo}`}
                  className="max-w-full max-h-[70vh] object-contain"
                  onError={(e) => {
                    console.error('Gagal memuat gambar:', imageUrl);
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HYWdhbCBtdW5jdWwgbWVtdWF0IGdhbWJhcjwvdGV4dD48L3N2Zz4=";
                  }}
                  onLoad={() => console.log('Gambar berhasil dimuat:', imageUrl.substring(0, 100) + '...')}
                />
              </div>
              <div className="flex justify-center mt-2">
                <a 
                  href={imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-lg ${
                    darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm`}
                >
                  Buka di Tab Baru
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Thumbnail component untuk preview gambar kecil - DIPERBAIKI
const ImageThumbnail = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}>
        <span>📷</span>
      </div>
    );
  }

  return (
    <img 
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => {
        console.error('Thumbnail error:', src.substring(0, 100) + '...');
        setImageError(true);
      }}
      onLoad={() => console.log('Thumbnail loaded successfully')}
    />
  );
};

// Mobile Ticket Card Component - DIPERBAIKI
const MobileTicketCard = ({ ticket, index, darkMode, onAction }) => {
  // Fungsi yang sama dengan AttachmentViewer untuk konsistensi
  const getImageUrl = (photoData) => {
    if (!photoData) return null;
    
    // Format 1: String URL
    if (typeof photoData === 'string') {
      if (photoData.startsWith('http')) {
        return photoData;
      } else if (photoData.startsWith('/')) {
        const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
        return `${baseUrl}${photoData}`;
      }
    }
    
    // Format 2: Object base64
    if (typeof photoData === 'object' && photoData !== null) {
      if (photoData.data && photoData.contentType) {
        return `data:${photoData.contentType};base64,${photoData.data}`;
      }
      
      // Cek properti lain
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

  const imageUrl = getImageUrl(ticket.attachment);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`p-4 rounded-xl mb-3 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}
      whileHover={{ scale: 1.02 }}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <div className="text-xs text-gray-500">Ticket #</div>
          <div className="font-mono font-bold text-sm">{ticket.ticketNo}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Priority</div>
          <div className="flex justify-end">
            <PriorityBadge priority={ticket.priority} darkMode={darkMode} />
          </div>
        </div>
      </div>

      {/* Thumbnail preview untuk mobile */}
      {imageUrl && (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">Preview Foto</div>
          <div className="flex justify-center">
            <ImageThumbnail 
              src={imageUrl}
              alt={`Preview ${ticket.ticketNo}`}
              className="w-20 h-20 rounded-lg border-2 border-gray-300"
            />
          </div>
        </div>
      )}

      <div className="space-y-2 mb-3">
        <div>
          <div className="text-xs text-gray-500">User</div>
          <div className="text-sm font-medium">{ticket.user}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Divisi</div>
          <div className="text-sm">{ticket.department}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Description</div>
          <div className="text-sm line-clamp-2">{ticket.description}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Assignee</div>
          <div className="text-sm">{ticket.assignee}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Status</div>
          <span className={`px-2 py-1 rounded-full text-xs ${
            ticket.status === 'Belum' ? 'bg-yellow-100 text-yellow-800' :
            ticket.status === 'Selesai' ? 'bg-green-100 text-green-800' :
            ticket.status === 'Ditolak' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {ticket.status}
          </span>
        </div>
        <div>
          <div className="text-xs text-gray-500">Lampiran</div>
          <AttachmentViewer attachment={ticket.attachment} ticketNo={ticket.ticketNo} darkMode={darkMode} />
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <motion.button
          onClick={() => onAction("resolve", ticket)}
          className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center justify-center gap-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>✅</span>
          <span>Selesai</span>
        </motion.button>
        <motion.button
          onClick={() => onAction("decline", ticket)}
          className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm flex items-center justify-center gap-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>❌</span>
          <span>Tolak</span>
        </motion.button>
        <motion.button
          onClick={() => onAction("delete", ticket)}
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-1"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span>🗑️</span>
          <span>Hapus</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

// Modal Resolve dengan Integrasi SharePoint
const ResolveModal = ({ ticket, onClose, onSubmit, darkMode, userName }) => {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { instance, accounts } = useMsal();

  const handleSubmit = async () => {
    setUploading(true);
    try {
      let sharePointItemId = null;
      let uploadedFileName = null;

      // 1. Format data untuk SharePoint
      const sharePointFields = formatTicketForSharePoint(ticket, notes, userName);
      
      // 2. Create item di SharePoint
      const sharePointResult = await sharePointAPI.createItem(instance, accounts, sharePointFields);
      sharePointItemId = sharePointResult.id;
      console.log('SharePoint item created:', sharePointItemId);

      // 3. Jika ada file, upload attachment
      if (file && sharePointItemId) {
        try {
          const uploadResult = await sharePointAPI.uploadAttachment(instance, accounts, sharePointItemId, file);
          uploadedFileName = uploadResult.fileName;
          
          // 4. Update metadata dengan nama file
          await sharePointAPI.updateField(instance, accounts, sharePointItemId, {
            [SHAREPOINT_CONFIG.donePhotoField]: uploadedFileName
          });
          console.log('File uploaded to SharePoint:', uploadedFileName);
        } catch (uploadError) {
          console.warn('File upload failed, but continuing:', uploadError);
          // Lanjutkan tanpa file jika upload gagal
        }
      }

      // 5. Update status di database lokal (Railway) dengan informasi SharePoint
      await onSubmit(ticket.id, notes, uploadedFileName, sharePointItemId);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={`Selesaikan Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${darkMode ? "bg-blue-900/20 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">📋 Informasi Ticket</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">No. Ticket:</span> {ticket.ticketNo}
            </div>
            <div>
              <span className="font-medium">User:</span> {ticket.user}
            </div>
            <div>
              <span className="font-medium">Divisi:</span> {ticket.department}
            </div>
            <div>
              <span className="font-medium">Priority:</span> {ticket.priority}
            </div>
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Upload Bukti Penyelesaian (Opsional)</label>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files[0])}
            className={`w-full p-2 border rounded ${
              darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
            }`}
            disabled={uploading}
          />
          {file && (
            <p className="text-sm text-green-500 mt-1">
              📎 File selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            File akan disimpan sebagai lampiran di SharePoint
          </p>
        </div>

        <div>
          <label className="block mb-2 font-medium">Catatan Penyelesaian</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={`w-full p-3 border rounded-lg ${
              darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
            }`}
            placeholder="Jelaskan tindakan yang dilakukan untuk menyelesaikan ticket ini..."
            disabled={uploading}
          />
        </div>

        <div className={`p-3 rounded-lg ${darkMode ? "bg-yellow-900/20 border border-yellow-700" : "bg-yellow-50 border border-yellow-200"}`}>
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">📢</span>
            <div className="text-sm">
              <strong>Perhatian:</strong> Data akan disimpan ke:
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Database Railway - Status ticket diubah menjadi "Selesai"</li>
                <li>SharePoint List - Data lengkap beserta lampiran (jika ada)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <motion.button
            onClick={onClose}
            disabled={uploading}
            className={`px-4 py-2 border rounded-lg ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            whileHover={!uploading ? { scale: 1.05 } : {}}
            whileTap={!uploading ? { scale: 0.95 } : {}}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={handleSubmit}
            disabled={uploading}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            whileHover={!uploading ? { scale: 1.05 } : {}}
            whileTap={!uploading ? { scale: 0.95 } : {}}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Menyimpan ke SharePoint...
              </>
            ) : (
              <>
                <span>✅</span>
                Konfirmasi Selesai
              </>
            )}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

// Main Component
export default function TicketEntry() {
  const { dark: darkMode } = useTheme();
  const { instance, accounts } = useMsal();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeModal, setActiveModal] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const user = accounts[0];
  const userName = user?.name || "Admin";

  // Effect untuk mendeteksi perubahan ukuran layar
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Stats calculation berdasarkan data real
  const stats = {
    total: tickets.length,
    urgent: tickets.filter(t => t.priority && t.priority.toLowerCase() === "urgent").length,
    high: tickets.filter(t => t.priority && t.priority.toLowerCase() === "high").length,
    normal: tickets.filter(t => t.priority && t.priority.toLowerCase() === "normal").length,
    belum: tickets.filter(t => t.status === "Belum").length,
  };

  // Load tickets dari server
  useEffect(() => {
    loadTickets();
  }, []);

  // Filter tickets berdasarkan search query
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = tickets.filter(ticket => 
      (ticket.ticketNo && ticket.ticketNo.toLowerCase().includes(query)) ||
      (ticket.user && ticket.user.toLowerCase().includes(query)) ||
      (ticket.department && ticket.department.toLowerCase().includes(query)) ||
      (ticket.description && ticket.description.toLowerCase().includes(query))
    );
    setFilteredTickets(filtered);
  }, [searchQuery, tickets]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Mengambil tiket dengan status "Belum" dari server Railway
      const data = await apiRequest("/api/tickets?status=Belum");
      
      console.log("Data received from server:", data);
      
      // PERBAIKAN: Format data dengan handling attachment yang lebih baik
      const formattedTickets = (data.rows || []).map(ticket => {
        console.log(`Processing ticket ${ticket.ticketNo}:`, ticket);
        
        // Simpan object photo lengkap untuk diproses di AttachmentViewer
        let attachment = ticket.photo || ticket.attachment || '';
        
        return {
          id: ticket._id || ticket.id,
          ticketNo: ticket.ticketNo,
          createdAt: ticket.createdAt,
          user: ticket.name,
          department: ticket.division,
          priority: ticket.priority || "Normal",
          description: ticket.description,
          assignee: ticket.assignee || userName,
          attachment: attachment, // Bisa string atau object base64
          status: ticket.status,
          notes: ticket.notes,
          operator: ticket.operator
        };
      });
      
      setTickets(formattedTickets);
    } catch (err) {
      console.error("Error loading tickets:", err);
      setError("Gagal memuat tiket: " + (err.message || "Koneksi ke server gagal"));
      setTickets([]); // Reset tickets jika error
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`min-h-screen p-3 sm:p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
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
              Ticket Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              Kelola tiket yang belum diproses - Connected to Railway & SharePoint
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Backend: https://it-backend-production.up.railway.app
            </p>
          </motion.div>
          
          <motion.div 
            className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0"
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
          >
            <StatCard title="Total" value={stats.total} color="blue" darkMode={darkMode} index={0} />
            <StatCard title="Belum" value={stats.belum} color="orange" darkMode={darkMode} index={1} />
            <StatCard title="Urgent" value={stats.urgent} color="red" darkMode={darkMode} index={2} />
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              onClick={() => window.print()}
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

      {/* Tickets Display - Responsive */}
      {isMobile ? (
        /* Mobile View - Card Layout */
        <motion.div 
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {loading ? (
            <div className="text-center p-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
              />
              <p className="mt-2 text-gray-500">Memuat tiket dari server...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              {searchQuery ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket yang belum diproses"}
            </div>
          ) : (
            <AnimatePresence>
              {filteredTickets.map((ticket, index) => (
                <MobileTicketCard 
                  key={ticket.id}
                  ticket={ticket}
                  index={index}
                  darkMode={darkMode}
                  onAction={(actionType, ticket) => {
                    setActiveModal(actionType);
                    setSelectedTicket(ticket);
                  }}
                />
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      ) : (
        /* Desktop View - Table Layout */
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
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Divisi</th>
                  <th className="p-4 text-left">Priority</th>
                  <th className="p-4 text-left">Description</th>
                  <th className="p-4 text-left">Lampiran</th>
                  <th className="p-4 text-left">Assignee</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
                      />
                      <p className="mt-2 text-gray-500">Memuat tiket dari server...</p>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      {searchQuery ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket yang belum diproses"}
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {filteredTickets.map((ticket, index) => (
                      <motion.tr 
                        key={ticket.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={index % 2 === 0 ? (darkMode ? "bg-gray-800" : "bg-white") : (darkMode ? "bg-gray-700" : "bg-gray-50")}
                        whileHover={{ backgroundColor: darkMode ? "rgba(55, 65, 81, 0.5)" : "rgba(243, 244, 246, 0.5)" }}
                      >
                        <td className="p-4 font-mono font-bold">{ticket.ticketNo}</td>
                        <td className="p-4">{ticket.user}</td>
                        <td className="p-4">{ticket.department}</td>
                        <td className="p-4">
                          <PriorityBadge priority={ticket.priority} darkMode={darkMode} />
                        </td>
                        <td className="p-4 max-w-xs">{ticket.description}</td>
                        <td className="p-4">
                          <AttachmentViewer attachment={ticket.attachment} ticketNo={ticket.ticketNo} darkMode={darkMode} />
                        </td>
                        <td className="p-4">{ticket.assignee}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            ticket.status === 'Belum' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'Selesai' ? 'bg-green-100 text-green-800' :
                            ticket.status === 'Ditolak' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <motion.button
                              onClick={() => {
                                setActiveModal("resolve");
                                setSelectedTicket(ticket);
                              }}
                              className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                              whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)" }}
                              whileTap={{ scale: 0.9 }}
                              title="Selesaikan Ticket"
                            >
                              ✅
                            </motion.button>
                            <motion.button
                              onClick={() => {
                                setActiveModal("decline");
                                setSelectedTicket(ticket);
                              }}
                              className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm"
                              whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(234, 179, 8, 0.5)" }}
                              whileTap={{ scale: 0.9 }}
                              title="Tolak Ticket"
                            >
                              ❌
                            </motion.button>
                            <motion.button
                              onClick={() => {
                                setActiveModal("delete");
                                setSelectedTicket(ticket);
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                              whileHover={{ scale: 1.1, boxShadow: "0 0 8px rgba(239, 68, 68, 0.5)" }}
                              whileTap={{ scale: 0.9 }}
                              title="Hapus Ticket"
                            >
                              🗑️
                            </motion.button>
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
      )}

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "resolve" && selectedTicket && (
          <ResolveModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={async (ticketId, notes, filePath, sharePointItemId) => {
              try {
                setError("");
                
                // Data yang dikirim ke server Railway
                const resolveData = {
                  notes: notes || "",
                  operator: userName,
                  resolvedPhoto: filePath,
                  sharePointItemId: sharePointItemId,
                  sharePointSync: true
                };

                console.log('Sending resolve data to Railway:', resolveData);

                // Update status di database Railway
                await apiRequest(`/api/tickets/${ticketId}/resolve`, {
                  method: "POST",
                  body: resolveData
                });
                
                setSuccess(`✅ Ticket berhasil diselesaikan dan disimpan ke SharePoint! (ID: ${sharePointItemId})`);
                setActiveModal(null);
                await loadTickets();
              } catch (err) {
                console.error('Error in main resolve handler:', err);
                setError("Gagal menyelesaikan tiket: " + err.message);
              }
            }}
            darkMode={darkMode}
            userName={userName}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "decline" && selectedTicket && (
          <DeclineModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={async (ticketId, reason) => {
              try {
                setError("");
                await apiRequest(`/api/tickets/${ticketId}/decline`, {
                  method: "POST",
                  body: { notes: reason || "", operator: userName }
                });
                setSuccess("Ticket berhasil ditolak");
                setActiveModal(null);
                await loadTickets();
              } catch (err) {
                setError("Gagal menolak tiket: " + err.message);
              }
            }}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "delete" && selectedTicket && (
          <DeleteModal
            ticket={selectedTicket}
            onClose={() => setActiveModal(null)}
            onSubmit={async (ticketId) => {
              try {
                setError("");
                await apiRequest(`/api/tickets/${ticketId}`, { method: "DELETE" });
                setSuccess("Ticket berhasil dihapus");
                setActiveModal(null);
                await loadTickets();
              } catch (err) {
                setError("Gagal menghapus tiket: " + err.message);
              }
            }}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Modal Components lainnya tetap sama
const DeclineModal = ({ ticket, onClose, onSubmit, darkMode }) => {
  const [reason, setReason] = useState("");

  return (
    <Modal title={`Tolak Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <div>
          <label className="block mb-2 font-medium">Alasan Penolakan</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={`w-full p-2 border rounded ${
              darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"
            }`}
            placeholder="Berikan alasan penolakan..."
            required
          />
        </div>
        <div className="flex gap-2 justify-end">
          <motion.button
            onClick={onClose}
            className={`px-4 py-2 border rounded-lg ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={() => onSubmit(ticket.id, reason)}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Tolak Ticket
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

const DeleteModal = ({ ticket, onClose, onSubmit, darkMode }) => {
  return (
    <Modal title={`Hapus Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <p>Apakah Anda yakin ingin menghapus ticket ini? Tindakan ini tidak dapat dibatalkan.</p>
        <div className="flex gap-2 justify-end">
          <motion.button
            onClick={onClose}
            className={`px-4 py-2 border rounded-lg ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Batal
          </motion.button>
          <motion.button
            onClick={() => onSubmit(ticket.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Hapus
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};