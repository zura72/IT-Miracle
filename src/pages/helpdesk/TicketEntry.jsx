import React, { useEffect, useState, useRef } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme } from "../../context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheckCircle, FaBan, FaSync, FaUpload, FaTimes, FaTicketAlt, FaEdit, FaExclamationTriangle, FaCheck, FaCalendar, FaUserCheck, FaClock, FaBuilding, FaUser, FaCamera } from "react-icons/fa";

// API Functions
const apiRequest = async (endpoint, options = {}) => {
  const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const config = {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    };

    if (config.body && typeof config.body !== 'string') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error ${response.status}:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// SharePoint Config
const SHAREPOINT_CONFIG = {
  siteId: "waskitainfra.sharepoint.com,32252c41-8aed-4ed2-ba35-b6e2731b0d4a,fb2ae80c-1283-4942-a3e8-0d47e8d004fb",
  listId: "e4a152ba-ee6e-4e1d-9c74-04e8d32ea912",
  graphScopes: ["https://graph.microsoft.com/Sites.ReadWrite.All"],
  sharepointScopes: ["https://waskitainfra.sharepoint.com/.default"]
};

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
      } transition-all duration-300 ${className}`}
  >
    {children}
  </motion.div>
);

// SharePoint API Functions - DIPERBAIKI
const sharePointAPI = {
  // Create item dengan field yang sesuai schema
  createTicketItem: async (instance, accounts, fields) => {
    try {
      const account = accounts?.[0];
      if (!account) throw new Error('No account available');

      const token = await instance.acquireTokenSilent({ 
        scopes: SHAREPOINT_CONFIG.graphScopes, 
        account 
      });

      // Format field yang lebih sederhana
      const simpleFields = {
        Title: fields.Title || `Ticket ${fields.TicketNumber || new Date().getTime()}`,
        Description: fields.Description || "No description",
        Priority: fields.Priority || "Normal",
        Status: fields.Status || "New"
      };

      console.log('Creating SharePoint item with fields:', simpleFields);

      const url = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteId}/lists/${SHAREPOINT_CONFIG.listId}/items`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: simpleFields
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SharePoint creation failed:', errorText);
        throw new Error(`SharePoint creation failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('SharePoint item created successfully:', result);
      return result;

    } catch (error) {
      console.error('Error in createTicketItem:', error);
      throw error;
    }
  },

  // Upload attachment dengan Graph API
  uploadAttachment: async (instance, accounts, itemId, file) => {
    try {
      const account = accounts?.[0];
      if (!account) throw new Error('No account available');

      const token = await instance.acquireTokenSilent({ 
        scopes: SHAREPOINT_CONFIG.graphScopes, 
        account 
      });

      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64String = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${SHAREPOINT_CONFIG.siteId}/lists/${SHAREPOINT_CONFIG.listId}/items/${itemId}/attachments`;
      
      console.log('Uploading attachment via Graph API...');
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: file.name,
          contentBytes: base64String
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Graph API attachment upload failed:', errorText);
        throw new Error(`Graph API upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Attachment uploaded successfully via Graph API:', result);
      return result;

    } catch (error) {
      console.error('Error in uploadAttachment:', error);
      throw error;
    }
  },

  // Upload attachment dengan SharePoint REST API (dengan delay untuk menghindari conflict)
  uploadAttachmentWithDelay: async (instance, accounts, itemId, file, delayMs = 1000) => {
    try {
      // Tambahkan delay untuk menghindari conflict
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const account = accounts?.[0];
      if (!account) throw new Error('No account available');

      const token = await instance.acquireTokenSilent({ 
        scopes: SHAREPOINT_CONFIG.sharepointScopes, 
        account 
      });

      const buffer = await file.arrayBuffer();
      
      // Gunakan SharePoint REST API endpoint
      const uploadUrl = `https://waskitainfra.sharepoint.com/sites/ITHELPDESK/_api/web/lists(guid'${SHAREPOINT_CONFIG.listId}')/items(${itemId})/AttachmentFiles/add(FileName='${encodeURIComponent(file.name)}')`;
      
      console.log('Uploading attachment via SharePoint REST API...');
      
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
          "Accept": "application/json;odata=verbose",
          "Content-Type": "application/octet-stream",
        },
        body: buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('SharePoint REST API attachment upload failed:', errorText);
        
        // Jika error 409, coba lagi dengan delay yang lebih lama
        if (response.status === 409 && delayMs < 5000) {
          console.log('Retrying upload with longer delay...');
          return await sharePointAPI.uploadAttachmentWithDelay(instance, accounts, itemId, file, delayMs + 1000);
        }
        
        throw new Error(`SharePoint REST API upload failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Attachment uploaded successfully via SharePoint REST API:', result);
      return result;

    } catch (error) {
      console.error('Error in uploadAttachmentWithDelay:', error);
      throw error;
    }
  }
};

// Helper Functions
const calculateEstimatedTime = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const diffInMs = new Date(endTime) - new Date(startTime);
  const diffInMinutes = Math.round(diffInMs / (1000 * 60));
  return diffInMinutes > 0 ? diffInMinutes : 0;
};

// Animation Variants
const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const staggerChildren = { visible: { transition: { staggerChildren: 0.1 } } };
const slideIn = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4 } } };

// StatCard Component
const StatCard = ({ title, value, color, darkMode, index }) => {
  const colorClasses = {
    blue: darkMode ? "bg-blue-900/20 text-blue-400" : "bg-blue-100 text-blue-600",
    red: darkMode ? "bg-red-900/20 text-red-400" : "bg-red-100 text-red-600",
    orange: darkMode ? "bg-orange-900/20 text-orange-400" : "bg-orange-100 text-orange-600",
    green: darkMode ? "bg-green-900/20 text-green-400" : "bg-green-100 text-green-600",
    purple: darkMode ? "bg-purple-900/20 text-purple-400" : "bg-purple-100 text-purple-600",
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

// PriorityBadge Component
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

// Modal Component
const Modal = ({ title, children, onClose, darkMode, size = "md" }) => {
  const sizeClasses = {
    sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl"
  };

  return (
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
        className={`rounded-2xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto ${darkMode ? "bg-gray-800" : "bg-white"} shadow-2xl`}
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
};

// AttachmentViewer Component - DIPERBAIKI
const AttachmentViewer = ({ attachment, ticketNo, darkMode, label = "Lampiran" }) => {
  const [showImageModal, setShowImageModal] = useState(false);
  
  const getImageUrl = (photoData) => {
    if (!photoData) return null;
    
    if (typeof photoData === 'string') {
      if (photoData.startsWith('http')) return photoData;
      if (photoData.startsWith('/')) {
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

  const imageUrl = getImageUrl(attachment);

  if (!imageUrl) {
    return <span className="text-gray-500 text-sm">Tidak ada {label.toLowerCase()}</span>;
  }

  return (
    <>
      <motion.div
        className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${
          darkMode ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-200"
        } transition-colors cursor-pointer hover:shadow-md`}
        onClick={() => setShowImageModal(true)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="relative w-20 h-20 overflow-hidden rounded-md border border-gray-300 dark:border-gray-600">
          <img 
            src={imageUrl} 
            alt={`Thumbnail ${label}`}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNDAiIHk9IjQwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=";
            }}
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
          <span>📎</span>
          <span>Lihat {label}</span>
        </div>
      </motion.div>

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
              className="relative max-w-4xl w-full max-h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-t-lg flex justify-between items-center flex-shrink-0`}>
                <h3 className="font-semibold text-lg">{label} - Ticket {ticketNo}</h3>
                <motion.button 
                  onClick={() => setShowImageModal(false)}
                  className="text-2xl hover:opacity-70 p-1"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>
              
              <div className="bg-black flex items-center justify-center p-4 rounded-b-lg flex-grow overflow-auto">
                <div className="max-w-full max-h-[70vh] flex items-center justify-center">
                  <img 
                    src={imageUrl} 
                    alt={`${label} ticket ${ticketNo}`}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5HYWdhbCBtdW5jdWwgbWVtdWF0IGdhbWJhcjwvdGV4dD48L3N2Zz4=";
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-center mt-4 flex-shrink-0">
                <a 
                  href={imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`px-6 py-2 rounded-lg font-medium ${
                    darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm transition-colors flex items-center gap-2`}
                >
                  <span>🔗</span>
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

// ImageThumbnail Component - DIPERBAIKI
const ImageThumbnail = ({ src, alt, className = "", onClick }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src || imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-500 rounded-lg border border-gray-300 ${className}`}
        onClick={onClick}
      >
        <div className="text-center">
          <span className="text-2xl">📷</span>
          <p className="text-xs mt-1">No Image</p>
        </div>
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`object-cover rounded-lg border border-gray-300 cursor-pointer hover:shadow-md transition-shadow ${className}`}
      onError={() => setImageError(true)}
      onClick={onClick}
    />
  );
};

// MobileTicketCard Component - DIPERBAIKI
const MobileTicketCard = ({ ticket, index, darkMode, onAction }) => {
  const getImageUrl = (photoData) => {
    if (!photoData) return null;
    if (typeof photoData === 'string') {
      if (photoData.startsWith('http')) return photoData;
      if (photoData.startsWith('/')) {
        const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
        return `${baseUrl}${photoData}`;
      }
    }
    if (typeof photoData === 'object' && photoData !== null) {
      if (photoData.data && photoData.contentType) return `data:${photoData.contentType};base64,${photoData.data}`;
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
        <div><div className="text-xs text-gray-500">Ticket #</div><div className="font-mono font-bold text-sm">{ticket.ticketNo}</div></div>
        <div><div className="text-xs text-gray-500">Priority</div><div className="flex justify-end"><PriorityBadge priority={ticket.priority} darkMode={darkMode} /></div></div>
      </div>

      {/* Improved Attachment Section */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-2">Bukti Insiden</div>
        {imageUrl ? (
          <div className="flex justify-center">
            <ImageThumbnail 
              src={imageUrl} 
              alt={`Bukti ${ticket.ticketNo}`} 
              className="w-24 h-24" 
              onClick={() => onAction("view", ticket)}
            />
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-2">
            Tidak ada bukti insiden
          </div>
        )}
      </div>

      <div className="space-y-2 mb-3">
        <div><div className="text-xs text-gray-500">User</div><div className="text-sm font-medium">{ticket.user}</div></div>
        <div><div className="text-xs text-gray-500">Divisi</div><div className="text-sm">{ticket.department}</div></div>
        <div><div className="text-xs text-gray-500">Description</div><div className="text-sm line-clamp-2">{ticket.description}</div></div>
        <div><div className="text-xs text-gray-500">Assignee</div><div className="text-sm">{ticket.assignee}</div></div>
        <div><div className="text-xs text-gray-500">Status</div><span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'Belum' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>{ticket.status}</span></div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <motion.button 
          onClick={() => onAction("confirm", ticket)} 
          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm flex items-center justify-center gap-1" 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
        >
          <span>✅</span>
          <span>Konfirmasi</span>
        </motion.button>
        <motion.button 
          onClick={() => onAction("decline", ticket)} 
          className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-1" 
          whileHover={{ scale: 1.05 }} 
          whileTap={{ scale: 0.95 }}
        >
          <span>❌</span>
          <span>Tolak</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

// ConfirmModal Component - DIPERBAIKI
const ConfirmModal = ({ ticket, onClose, onSubmit, darkMode, userName, instance, accounts }) => {
  const [formData, setFormData] = useState({
    Title: ticket?.description?.substring(0, 100) || "",
    Description: ticket?.description || "",
    Priority: ticket?.priority || "Normal",
    Status: "Dalam Proses",
    ReportedTime: new Date().toISOString().slice(0, 16),
    Assignee: userName || "",
    EstimatedResolutionTime: 0,
    CompletionTime: "",
    TicketNumber: parseInt(ticket?.ticketNo) || 0,
    Division: ticket?.department || "",
    TicketType: "Insiden",
    Requestor: ticket?.user || ""
  });
  const [resolutionScreenshotFile, setResolutionScreenshotFile] = useState(null);
  const [resolutionScreenshotPreview, setResolutionScreenshotPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const resolutionScreenshotInputRef = useRef(null);

  const getIncidentImageUrl = () => {
    if (!ticket.attachment) return null;
    if (typeof ticket.attachment === 'string') {
      if (ticket.attachment.startsWith('http')) return ticket.attachment;
      if (ticket.attachment.startsWith('/')) {
        const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
        return `${baseUrl}${ticket.attachment}`;
      }
    }
    if (typeof ticket.attachment === 'object' && ticket.attachment !== null) {
      if (ticket.attachment.data && ticket.attachment.contentType) return `data:${ticket.attachment.contentType};base64,${ticket.attachment.data}`;
      const possibleBase64Fields = ['base64', 'buffer', 'file', 'image'];
      for (const field of possibleBase64Fields) {
        if (ticket.attachment[field] && typeof ticket.attachment[field] === 'string') {
          const contentType = ticket.attachment.contentType || ticket.attachment.type || 'image/jpeg';
          return `data:${contentType};base64,${ticket.attachment[field]}`;
        }
      }
    }
    return null;
  };

  const incidentImageUrl = getIncidentImageUrl();

  const handleInputChange = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    if (field === 'CompletionTime' && value && formData.ReportedTime) {
      updatedData.EstimatedResolutionTime = calculateEstimatedTime(formData.ReportedTime, value);
    }
    if (field === 'ReportedTime' && value && formData.CompletionTime) {
      updatedData.EstimatedResolutionTime = calculateEstimatedTime(value, formData.CompletionTime);
    }
    setFormData(updatedData);
  };

  const onPickResolutionScreenshot = (e) => {
    const f = e.target.files?.[0];
    if (f) { 
      setResolutionScreenshotFile(f); 
      setResolutionScreenshotPreview(URL.createObjectURL(f)); 
    }
  };

  const removeResolutionScreenshot = () => {
    setResolutionScreenshotFile(null);
    if (resolutionScreenshotPreview) URL.revokeObjectURL(resolutionScreenshotPreview);
    setResolutionScreenshotPreview("");
    if (resolutionScreenshotInputRef.current) resolutionScreenshotInputRef.current.value = "";
  };

  const uploadAttachmentSafely = async (itemId, file, fileName) => {
    try {
      setUploadProgress(`Mengupload ${fileName}...`);
      
      // Coba Graph API dulu
      try {
        const result = await sharePointAPI.uploadAttachment(instance, accounts, itemId, file);
        console.log(`${fileName} uploaded successfully via Graph API`);
        return result;
      } catch (graphError) {
        console.log(`Graph API failed for ${fileName}, trying SharePoint REST API...`);
        
        // Fallback ke SharePoint REST API dengan delay
        const result = await sharePointAPI.uploadAttachmentWithDelay(instance, accounts, itemId, file);
        console.log(`${fileName} uploaded successfully via SharePoint REST API`);
        return result;
      }
    } catch (error) {
      console.warn(`Upload failed for ${fileName}:`, error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setUploading(true);
    setUploadProgress("Memulai proses...");
    
    try {
      let sharePointItemId = null;
      
      const sharePointFields = {
        Title: formData.Title || `Ticket ${ticket.ticketNo}`,
        Description: formData.Description || "No description",
        Priority: formData.Priority || "Normal",
        Status: formData.Status || "Dalam Proses",
        ReportedTime: formData.ReportedTime ? new Date(formData.ReportedTime).toISOString() : new Date().toISOString(),
        Assignee: formData.Assignee || userName,
        EstimatedResolutionTime: formData.EstimatedResolutionTime || 0,
        CompletionTime: formData.CompletionTime ? new Date(formData.CompletionTime).toISOString() : null,
        TicketNumber: formData.TicketNumber || parseInt(ticket.ticketNo) || 0,
        Division: formData.Division || ticket.department || "Umum",
        TicketType: formData.TicketType || "Insiden",
        Requestor: formData.Requestor || ticket.user || ""
      };

      setUploadProgress("Membuat item di SharePoint...");
      
      // Buat item di SharePoint
      const sharePointResult = await sharePointAPI.createTicketItem(instance, accounts, sharePointFields);
      sharePointItemId = sharePointResult.id;

      console.log('SharePoint item created with ID:', sharePointItemId);
      setUploadProgress(`Item berhasil dibuat (ID: ${sharePointItemId}). Mengupload attachments...`);

      // Upload attachments secara sequential untuk menghindari conflict
      if (incidentImageUrl) {
        try {
          setUploadProgress("Mengupload bukti insiden...");
          const response = await fetch(incidentImageUrl);
          const blob = await response.blob();
          const file = new File([blob], `incident-${ticket.ticketNo}.jpg`, { type: blob.type });
          
          await uploadAttachmentSafely(sharePointItemId, file, "bukti insiden");
          console.log('Incident screenshot uploaded successfully');
        } catch (uploadError) {
          console.warn('Incident screenshot upload failed:', uploadError);
        }
      }

      if (resolutionScreenshotFile) {
        try {
          setUploadProgress("Mengupload bukti penyelesaian...");
          await uploadAttachmentSafely(sharePointItemId, resolutionScreenshotFile, "bukti penyelesaian");
          console.log('Resolution screenshot uploaded successfully');
        } catch (uploadError) {
          console.warn('Resolution screenshot upload failed:', uploadError);
        }
      }

      setUploadProgress("Menyimpan ke database...");

      // PERBAIKI: Gunakan ticket._id untuk backend
      const ticketId = ticket._id || ticket.id;
      if (!ticketId) {
        throw new Error('Ticket ID tidak ditemukan');
      }

      console.log('Submitting to backend with ticketId:', ticketId);
      
      await onSubmit(ticketId, sharePointItemId);
      
    } catch (error) {
      console.error('Error in confirm submission:', error);
      setUploadProgress(`Error: ${error.message}`);
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  return (
    <Modal title={`Konfirmasi Ticket ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode} size="lg">
      <div className="space-y-6">
        {uploadProgress && (
          <div className={`p-3 rounded-lg ${darkMode ? "bg-blue-900/20 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
            <div className="flex items-center gap-2">
              <FaSync className="animate-spin" />
              <span className="text-sm">{uploadProgress}</span>
            </div>
          </div>
        )}

        <div className={`p-4 rounded-lg ${darkMode ? "bg-blue-900/20 border border-blue-700" : "bg-blue-50 border border-blue-200"}`}>
          <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2"><FaTicketAlt />Informasi Ticket Awal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">No. Ticket:</span> {ticket.ticketNo}</div>
            <div><span className="font-medium">User:</span> {ticket.user}</div>
            <div><span className="font-medium">Divisi:</span> {ticket.department}</div>
            <div><span className="font-medium">Priority:</span> {ticket.priority}</div>
            <div className="md:col-span-2"><span className="font-medium">Description:</span> {ticket.description}</div>
            <div><span className="font-medium">Ticket ID:</span> {ticket._id || ticket.id}</div>
          </div>
        </div>

        {/* Form fields - sama seperti sebelumnya */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-2 font-medium flex items-center gap-2"><FaTicketAlt className="text-blue-500" />Title *</label>
            <input type="text" value={formData.Title} onChange={(e) => handleInputChange("Title", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} placeholder="Judul ticket..." required />
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2 font-medium flex items-center gap-2"><FaEdit className="text-blue-500" />Insiden/Keluhan Saat Ini *</label>
            <textarea value={formData.Description} onChange={(e) => handleInputChange("Description", e.target.value)} rows={4} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} placeholder="Deskripsi lengkap insiden atau keluhan..." required />
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaExclamationTriangle className="text-orange-500" />Prioritas *</label>
            <select value={formData.Priority} onChange={(e) => handleInputChange("Priority", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} required>
              <option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option><option value="Low">Low</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaCheckCircle className="text-green-500" />Status *</label>
            <select value={formData.Status} onChange={(e) => handleInputChange("Status", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} required>
              <option value="Dalam Proses">Dalam Proses</option><option value="Menunggu">Menunggu</option><option value="Selesai">Selesai</option><option value="Ditolak">Ditolak</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaCalendar className="text-purple-500" />Waktu Pelaporan *</label>
            <input type="datetime-local" value={formData.ReportedTime} onChange={(e) => handleInputChange("ReportedTime", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} required />
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaUserCheck className="text-blue-500" />Pelaksana (Tim IT) *</label>
            <input type="text" value={formData.Assignee} onChange={(e) => handleInputChange("Assignee", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} placeholder="Nama pelaksana..." required />
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaCheck className="text-green-500" />Waktu Selesai</label>
            <input type="datetime-local" value={formData.CompletionTime} onChange={(e) => handleInputChange("CompletionTime", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} />
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaClock className="text-yellow-500" />Estimasi Waktu Penyelesaian (Menit)</label>
            <input type="number" value={formData.EstimatedResolutionTime} readOnly className={`w-full px-3 py-2 rounded-lg border bg-gray-100 ${darkMode ? "bg-gray-600 border-gray-500 text-white" : "border-gray-300 text-gray-800"}`} placeholder="Akan terisi otomatis" />
            <p className="text-xs text-gray-500 mt-1">* Terisi otomatis berdasarkan selisih Waktu Pelaporan dan Waktu Selesai</p>
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaBuilding className="text-blue-500" />Divisi/Departemen *</label>
            <select value={formData.Division} onChange={(e) => handleInputChange("Division", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} required>
              <option value="IT">IT & System</option><option value="HR">Human Capital</option><option value="Finance">Finance & Accounting</option><option value="Engineering">Engineering</option><option value="Marketing">Marketing & Sales</option><option value="Operation">Operation & Maintenance</option><option value="Procurement">Procurement & Logistic</option><option value="Project">Project</option><option value="QHSE">QHSE</option><option value="Warehouse">Warehouse</option><option value="Umum">Umum</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium flex items-center gap-2"><FaTicketAlt className="text-purple-500" />Tipe Tiket *</label>
            <select value={formData.TicketType} onChange={(e) => handleInputChange("TicketType", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} required>
              <option value="Insiden">Insiden</option><option value="Permintaan">Permintaan</option><option value="Keluhan">Keluhan</option><option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block mb-2 font-medium flex items-center gap-2"><FaUser className="text-green-500" />User Requestor *</label>
            <input type="text" value={formData.Requestor} onChange={(e) => handleInputChange("Requestor", e.target.value)} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300 text-gray-800"}`} placeholder="Nama user yang melaporkan..." required />
          </div>
        </div>

        {/* Improved Attachment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-semibold mb-4 flex items-center gap-2"><FaCamera className="text-red-500" />Screenshot Bukti Insiden/Keluhan</label>
            <div className="flex flex-col items-center space-y-4">
              {incidentImageUrl ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ duration: 0.2 }} 
                  className="relative w-full max-w-xs"
                >
                  <img 
                    src={incidentImageUrl} 
                    alt="Bukti insiden dari user" 
                    className="w-full h-48 object-cover rounded-2xl border-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => window.open(incidentImageUrl, '_blank')}
                  />
                  <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center rounded-2xl opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium bg-green-600 px-3 py-2 rounded-lg">Klik untuk melihat detail</span>
                  </div>
                </motion.div>
              ) : (
                <div className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl ${darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
                  <FaTimes className="h-12 w-12 mb-3" />
                  <span className="text-lg">Tidak ada bukti</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">Gambar bukti insiden diambil otomatis dari lampiran user</p>
          </div>

          <div>
            <label className="block text-lg font-semibold mb-4 flex items-center gap-2"><FaCamera className="text-green-500" />Screenshot Bukti Ticket Sudah Dilakukan</label>
            <div className="flex flex-col items-center space-y-4">
              <motion.label 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                transition={{ duration: 0.2 }} 
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${darkMode ? 'border-gray-600 hover:border-green-500 text-gray-400 hover:text-green-400' : 'border-gray-300 hover:border-green-500 text-gray-500 hover:text-green-600'}`}
              >
                <FaUpload className="h-12 w-12 mb-3" />
                <span className="text-lg">Upload Bukti Penyelesaian</span>
                <span className="text-sm mt-1">Klik untuk memilih file</span>
                <input ref={resolutionScreenshotInputRef} type="file" accept="image/*" onChange={onPickResolutionScreenshot} className="hidden" />
              </motion.label>
              
              {resolutionScreenshotPreview ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  transition={{ duration: 0.2 }} 
                  className="relative w-full max-w-xs"
                >
                  <img 
                    src={resolutionScreenshotPreview} 
                    alt="preview bukti penyelesaian" 
                    className="w-full h-48 object-cover rounded-2xl border-2 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => window.open(resolutionScreenshotPreview, '_blank')}
                  />
                  <motion.button 
                    whileHover={{ scale: 1.1 }} 
                    transition={{ duration: 0.2 }} 
                    type="button" 
                    onClick={removeResolutionScreenshot} 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 shadow-lg hover:bg-red-600"
                  >
                    <FaTimes className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              ) : null}
            </div>
            <p className="text-sm text-gray-500 mt-3 text-center">Upload bukti screenshot setelah ticket diselesaikan</p>
          </div>
        </div>

        <div className="flex gap-4 justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <motion.button onClick={onClose} disabled={uploading} className={`px-6 py-3 rounded-xl font-medium transition ${darkMode ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`} whileHover={!uploading ? { scale: 1.05 } : {}} whileTap={!uploading ? { scale: 0.95 } : {}}>Batal</motion.button>
          <motion.button onClick={handleSubmit} disabled={uploading} className="px-6 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-60 flex items-center space-x-2" whileHover={!uploading ? { scale: 1.05 } : {}} whileTap={!uploading ? { scale: 0.95 } : {}}>
            {uploading ? <><FaSync className="animate-spin" /><span>Menyimpan...</span></> : <><FaCheckCircle /><span>Konfirmasi & Simpan</span></>}
          </motion.button>
        </div>
      </div>
    </Modal>
  );
};

// DeclineModal Component
const DeclineModal = ({ ticket, onClose, onSubmit, darkMode, userName, instance, accounts }) => {
  const [reason, setReason] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async () => {
    setUploading(true);
    try {
      let sharePointItemId = null;
      
      const sharePointFields = {
        Title: `[DITOLAK] ${ticket.description?.substring(0, 50)}...` || `[DITOLAK] Ticket ${ticket.ticketNo}`,
        Description: `TICKET: ${ticket.ticketNo}\nUSER: ${ticket.user}\nDIVISI: ${ticket.department}\nPRIORITAS: ${ticket.priority}\nDESKRIPSI: ${ticket.description || "Tidak ada deskripsi"}\n\n--- PENOLAKAN ---\nOPERATOR: ${userName}\nTANGGAL: ${new Date().toLocaleString('id-ID')}\nALASAN PENOLAKAN: ${reason || "Tidak ada alasan"}`,
        Priority: ticket.priority || "Normal",
        Status: "Ditolak",
        ReportedTime: new Date().toISOString(),
        Assignee: userName || "",
        EstimatedResolutionTime: 0,
        TicketNumber: parseInt(ticket.ticketNo) || 0,
        Division: ticket.department || "Umum",
        TicketType: "Insiden",
        Requestor: ticket.user || ""
      };

      try {
        const sharePointResult = await sharePointAPI.createTicketItem(instance, accounts, sharePointFields);
        sharePointItemId = sharePointResult.id;
        console.log('Declined ticket saved to SharePoint with ID:', sharePointItemId);
      } catch (sharePointError) {
        console.log('SharePoint creation failed, but continuing with Railway update...', sharePointError);
      }

      // PERBAIKI: Gunakan ticket._id untuk backend
      const ticketId = ticket._id || ticket.id;
      if (!ticketId) {
        throw new Error('Ticket ID tidak ditemukan');
      }

      await onSubmit(ticketId, reason, sharePointItemId);
    } catch (error) {
      console.error('Error in decline submission:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={`Tolak Permintaan ${ticket.ticketNo}`} onClose={onClose} darkMode={darkMode}>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg ${darkMode ? "bg-red-900/20 border border-red-700" : "bg-red-50 border border-red-200"}`}>
          <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2"><FaBan />Informasi Ticket yang Akan Ditolak</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="font-medium">No. Ticket:</span> {ticket.ticketNo}</div>
            <div><span className="font-medium">User:</span> {ticket.user}</div>
            <div><span className="font-medium">Divisi:</span> {ticket.department}</div>
            <div><span className="font-medium">Priority:</span> {ticket.priority}</div>
            <div><span className="font-medium">Ticket ID:</span> {ticket._id || ticket.id}</div>
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium">Alasan Penolakan *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className={`w-full p-3 border rounded-lg ${darkMode ? "bg-gray-700 border-gray-600" : "border-gray-300"}`} placeholder="Berikan alasan penolakan permintaan ini..." required />
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <motion.button onClick={onClose} disabled={uploading} className={`px-4 py-2 border rounded-lg ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"} ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`} whileHover={!uploading ? { scale: 1.05 } : {}} whileTap={!uploading ? { scale: 0.95 } : {}}>Batal</motion.button>
          <motion.button onClick={handleSubmit} disabled={!reason.trim() || uploading} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" whileHover={(!reason.trim() || uploading) ? {} : { scale: 1.05 }} whileTap={(!reason.trim() || uploading) ? {} : { scale: 0.95 }}>
            {uploading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Menolak...</> : <><FaBan />Tolak Permintaan</>}
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
  const [viewImageModal, setViewImageModal] = useState({ show: false, imageUrl: null, title: "" });

  const user = accounts[0];
  const userName = user?.name || "Admin";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stats = {
    total: tickets.length,
    urgent: tickets.filter(t => t.priority && t.priority.toLowerCase() === "urgent").length,
    high: tickets.filter(t => t.priority && t.priority.toLowerCase() === "high").length,
    normal: tickets.filter(t => t.priority && t.priority.toLowerCase() === "normal").length,
    belum: tickets.filter(t => t.status === "Belum").length,
  };

  useEffect(() => {
    loadTickets();
  }, []);

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
      const data = await apiRequest("/api/tickets?status=Belum");
      
      const formattedTickets = (data.rows || []).map(ticket => ({
        id: ticket._id || ticket.id,
        _id: ticket._id, // Pastikan _id ada
        ticketNo: ticket.ticketNo,
        createdAt: ticket.createdAt,
        user: ticket.name,
        department: ticket.division,
        priority: ticket.priority || "Normal",
        description: ticket.description,
        assignee: ticket.assignee || userName,
        attachment: ticket.photo || ticket.attachment || '',
        status: ticket.status,
        notes: ticket.notes,
        operator: ticket.operator
      }));
      
      setTickets(formattedTickets);
    } catch (err) {
      console.error("Error loading tickets:", err);
      setError("Gagal memuat tiket: " + (err.message || "Koneksi ke server gagal"));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileAction = (actionType, ticket) => {
    if (actionType === "view") {
      const getImageUrl = (photoData) => {
        if (!photoData) return null;
        if (typeof photoData === 'string') {
          if (photoData.startsWith('http')) return photoData;
          if (photoData.startsWith('/')) {
            const baseUrl = process.env.REACT_APP_API_URL || "https://it-backend-production.up.railway.app";
            return `${baseUrl}${photoData}`;
          }
        }
        if (typeof photoData === 'object' && photoData !== null) {
          if (photoData.data && photoData.contentType) return `data:${photoData.contentType};base64,${photoData.data}`;
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
      if (imageUrl) {
        setViewImageModal({
          show: true,
          imageUrl: imageUrl,
          title: `Bukti Insiden - Ticket ${ticket.ticketNo}`
        });
      }
    } else {
      setActiveModal(actionType);
      setSelectedTicket(ticket);
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
      <GlassCard darkMode={darkMode} className="p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <motion.div variants={slideIn}>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">IT Helpdesk Management</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Kelola tiket IT - Sync ke SharePoint Online</p>
          </motion.div>
          
          <motion.div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0" variants={staggerChildren} initial="hidden" animate="visible">
            <StatCard title="Total" value={stats.total} color="blue" darkMode={darkMode} index={0} />
            <StatCard title="Belum Dikonfirmasi" value={stats.belum} color="orange" darkMode={darkMode} index={1} />
            <StatCard title="Urgent" value={stats.urgent} color="red" darkMode={darkMode} index={2} />
            <StatCard title="High" value={stats.high} color="purple" darkMode={darkMode} index={3} />
          </motion.div>
        </div>

        <motion.div className="flex flex-col gap-4" variants={fadeIn}>
          <div className="flex-1">
            <motion.div className="relative" whileFocus={{ scale: 1.02 }}>
              <input type="text" placeholder="Cari tiket berdasarkan nomor, nama, divisi, atau deskripsi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full px-4 py-3 rounded-xl border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "border-gray-300"} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 text-sm sm:text-base`} />
              <span className="absolute right-3 top-3 text-gray-400">🔍</span>
            </motion.div>
          </div>
          
          <motion.div className="flex gap-2 flex-wrap" variants={staggerChildren}>
            <motion.button onClick={loadTickets} disabled={loading} className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-medium flex items-center gap-2 text-sm sm:text-base ${loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} text-white`} whileHover={{ scale: loading ? 1 : 1.05 }} whileTap={{ scale: 0.95 }}>{loading ? "⏳" : "🔄"} {loading ? "Loading..." : "Refresh"}</motion.button>
          </motion.div>
        </motion.div>
      </GlassCard>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`mb-6 p-3 sm:p-4 rounded-xl ${darkMode ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"} border`}>
            <div className="flex justify-between items-center text-sm sm:text-base"><span>❌ {error}</span><button onClick={() => setError("")} className="text-sm underline">Tutup</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className={`mb-6 p-3 sm:p-4 rounded-xl ${darkMode ? "bg-green-900/30 border-green-700" : "bg-green-50 border-green-200"} border`}>
            <div className="flex justify-between items-center text-sm sm:text-base"><span>✅ {success}</span><button onClick={() => setSuccess("")} className="text-sm underline">Tutup</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image View Modal for Mobile */}
      <AnimatePresence>
        {viewImageModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setViewImageModal({ show: false, imageUrl: null, title: "" })}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-4xl w-full max-h-full flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-4 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-t-lg flex justify-between items-center flex-shrink-0`}>
                <h3 className="font-semibold text-lg">{viewImageModal.title}</h3>
                <motion.button 
                  onClick={() => setViewImageModal({ show: false, imageUrl: null, title: "" })}
                  className="text-2xl hover:opacity-70 p-1"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>
              
              <div className="bg-black flex items-center justify-center p-4 rounded-b-lg flex-grow overflow-auto">
                <div className="max-w-full max-h-[70vh] flex items-center justify-center">
                  <img 
                    src={viewImageModal.imageUrl} 
                    alt={viewImageModal.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
              
              <div className="flex justify-center mt-4 flex-shrink-0">
                <a 
                  href={viewImageModal.imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`px-6 py-2 rounded-lg font-medium ${
                    darkMode ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-500 hover:bg-blue-600"
                  } text-white text-sm transition-colors flex items-center gap-2`}
                >
                  <span>🔗</span>
                  Buka di Tab Baru
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tickets Display */}
      {isMobile ? (
        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-3">
          {loading ? (
            <div className="text-center p-8">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-gray-500">Memuat tiket dari server...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-8 text-gray-500">{searchQuery ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket yang belum diproses"}</div>
          ) : (
            <AnimatePresence>
              {filteredTickets.map((ticket, index) => (
                <MobileTicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  index={index} 
                  darkMode={darkMode} 
                  onAction={handleMobileAction} 
                />
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      ) : (
        <GlassCard darkMode={darkMode} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={darkMode ? "bg-gray-700" : "bg-gray-100"}>
                  <th className="p-4 text-left">Ticket #</th>
                  <th className="p-4 text-left">User</th>
                  <th className="p-4 text-left">Divisi</th>
                  <th className="p-4 text-left">Priority</th>
                  <th className="p-4 text-left">Description</th>
                  <th className="p-4 text-left">Bukti Insiden</th>
                  <th className="p-4 text-left">Assignee</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                    <p className="mt-2 text-gray-500">Memuat tiket dari server...</p>
                  </td></tr>
                ) : filteredTickets.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-500">{searchQuery ? "Tidak ada tiket yang cocok dengan pencarian" : "Tidak ada tiket yang belum diproses"}</td></tr>
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
                      >
                        <td className="p-4 font-mono font-bold">{ticket.ticketNo}</td>
                        <td className="p-4">{ticket.user}</td>
                        <td className="p-4">{ticket.department}</td>
                        <td className="p-4"><PriorityBadge priority={ticket.priority} darkMode={darkMode} /></td>
                        <td className="p-4 max-w-xs">{ticket.description}</td>
                        <td className="p-4">
                          <AttachmentViewer 
                            attachment={ticket.attachment} 
                            ticketNo={ticket.ticketNo} 
                            darkMode={darkMode} 
                            label="Bukti Insiden" 
                          />
                        </td>
                        <td className="p-4">{ticket.assignee}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${ticket.status === 'Belum' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-center">
                            <motion.button 
                              onClick={() => { setActiveModal("confirm"); setSelectedTicket(ticket); }} 
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm flex items-center gap-1" 
                              whileHover={{ scale: 1.1 }} 
                              whileTap={{ scale: 0.9 }} 
                              title="Konfirmasi ke SharePoint"
                            >
                              <FaCheckCircle className="text-xs" />
                              <span>Konfirmasi</span>
                            </motion.button>
                            <motion.button 
                              onClick={() => { setActiveModal("decline"); setSelectedTicket(ticket); }} 
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm flex items-center gap-1" 
                              whileHover={{ scale: 1.1 }} 
                              whileTap={{ scale: 0.9 }} 
                              title="Tolak Permintaan"
                            >
                              <FaBan className="text-xs" />
                              <span>Tolak</span>
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
        </GlassCard>
      )}

      {/* Modals */}
      <AnimatePresence>
        {activeModal === "confirm" && selectedTicket && (
          <ConfirmModal 
            ticket={selectedTicket} 
            onClose={() => setActiveModal(null)} 
            onSubmit={async (ticketId, sharePointItemId) => {
              try {
                setError("");
                // PERBAIKI ENDPOINT - gunakan _id dari MongoDB
                const endpoint = `/api/tickets/${ticketId}/confirm`;
                console.log('Calling backend endpoint:', endpoint, 'with ticketId:', ticketId);
                
                await apiRequest(endpoint, { 
                  method: "POST", 
                  body: { 
                    operator: userName, 
                    sharePointItemId: sharePointItemId, 
                    status: "Terkonfirmasi" 
                  } 
                });
                
                if (sharePointItemId) {
                  setSuccess(`✅ Ticket berhasil dikonfirmasi dan disimpan ke SharePoint! (ID: ${sharePointItemId})`);
                } else {
                  setSuccess(`✅ Ticket berhasil dikonfirmasi!`);
                }
                setActiveModal(null);
                await loadTickets();
              } catch (err) {
                console.error('Error in confirm handler:', err);
                setError("Gagal mengkonfirmasi tiket: " + err.message);
              }
            }} 
            darkMode={darkMode} 
            userName={userName}
            instance={instance}
            accounts={accounts}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeModal === "decline" && selectedTicket && (
          <DeclineModal 
            ticket={selectedTicket} 
            onClose={() => setActiveModal(null)} 
            onSubmit={async (ticketId, reason, sharePointItemId) => {
              try {
                setError("");
                // PERBAIKI ENDPOINT - gunakan _id dari MongoDB
                const endpoint = `/api/tickets/${ticketId}/decline`;
                console.log('Calling backend endpoint:', endpoint, 'with ticketId:', ticketId);
                
                await apiRequest(endpoint, { 
                  method: "POST", 
                  body: { 
                    notes: reason || "", 
                    operator: userName, 
                    sharePointItemId: sharePointItemId, 
                    status: "Ditolak" 
                  } 
                });
                
                if (sharePointItemId) {
                  setSuccess(`✅ Permintaan berhasil ditolak dan dicatat di SharePoint! (ID: ${sharePointItemId})`);
                } else {
                  setSuccess(`✅ Permintaan berhasil ditolak!`);
                }
                setActiveModal(null);
                await loadTickets();
              } catch (err) {
                setError("Gagal menolak permintaan: " + err.message);
              }
            }} 
            darkMode={darkMode} 
            userName={userName}
            instance={instance}
            accounts={accounts}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}