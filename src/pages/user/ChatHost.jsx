// src/pages/user/ChatHost.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import "./ChatHost.css";

/* ===================== API URL HELPER ===================== */
export function apiUrl(path = "") {
  const base = process.env.REACT_APP_API_BASE || "https://it-backend-production.up.railway.app/api";
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function getBaseUrl() {
  const base = process.env.REACT_APP_API_BASE || "https://it-backend-production.up.railway.app";
  return base.replace('/api', '');
}

/* ===================== API Connection Test ===================== */
async function testApiConnection() {
  try {
    const url = apiUrl("/health"); 
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });

    clearTimeout(timeoutId);
    return response.status !== 0 && response.status < 500;
  } catch (error) {
    console.warn('API connection test failed:', error);
    return false;
  }
}

function useApiConnectionTest() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const testConnection = async () => {
    try {
      const isConnected = await testApiConnection();
      setIsOnline(isConnected);
      setLastChecked(new Date());
      if (isConnected) {
        setRetryCount(0);
      } else {
        setRetryCount(prev => prev + 1);
      }
      return isConnected;
    } catch (error) {
      console.warn('Connection test error:', error);
      setIsOnline(false);
      setLastChecked(new Date());
      setRetryCount(prev => prev + 1);
      return false;
    }
  };

  useEffect(() => {
    console.log("API Base URL:", apiUrl());
    console.log("Base URL for images:", getBaseUrl());
    
    testConnection();

    const intervalTime = isOnline ? 60000 : Math.min(30000 * Math.pow(1.5, retryCount), 120000);
    
    const interval = setInterval(() => {
      testConnection();
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isOnline, retryCount]);

  return { isOnline, lastChecked, testConnection, retryCount };
}

/* ===================== helpers ===================== */
const yesWords = new Set([
  "ya","iya","y","yaaa","ok","oke","baik","siap","betul","benar","yup",
  "yaudah","silakan","lanjut","yes","yap","okey","sip","gas"
]);

const noWords = new Set([
  "tidak","nggak","gak","no","belum","jangan","jgn","tdk","ga"
]);

const nowStr = () => new Date().toLocaleString();

// Data departemen berdasarkan struktur yang diminta
const DEPARTMENT_STRUCTURE = [
  {
    title: "BOD, Departemen. Internal Audit, dan Sekper",
    options: ["BOD", "Sekretariat Perusahaan", "Internal Audit"]
  },
  {
    title: "Departemen. Keuangan, dan Akuntansi", 
    options: ["Keuangan", "Akuntansi"]
  },
  {
    title: "Departemen. HCM & GA",
    options: ["HCM & GA"]
  },
  {
    title: "Departemen. Manajemen Risiko",
    options: ["Manajemen Risiko"]
  },
  {
    title: "Departemen Legal, Pemasaran, dan Pengembangan Bisnis & Portofolio",
    options: ["Legal", "Pemasaran", "Pengembangan Bisnis & Portofolio"]
  },
  {
    title: "Departemen TI & Sistem", 
    options: ["TI & Sistem"]
  },
  {
    title: "Unit Bisnis",
    options: ["Operasi"]
  },
  {
    title: "Proyek",
    options: ["Project Coordinator", "Proyek"]
  },
  {
    title: "Departemen. Produksi",
    options: ["Produksi & Peralatan", "Produksi & Peralatan WS 1", "Produksi & Peralatan WS 2"]
  },
  {
    title: "Workshop", 
    options: ["Workshop 1", "Workshop 2"]
  },
  {
    title: "PT Waskita Sangir Energi",
    options: ["WSE"]
  },
  {
    title: "PT Waskita Wado Energi", 
    options: ["WWE"]
  },
  {
    title: "Departemen. Pengendalian & QHSE",
    options: ["Pengendalian & QHSE"]
  },
  {
    title: "Departemen SCM",
    options: ["SCM"]
  }
];

const DEPARTMENT_OPTIONS = DEPARTMENT_STRUCTURE.flatMap(group => group.options);

/** Kirim tiket ke server - VERSION FIXED */
async function createTicket({ name, division, description, photo }) {
  // Validasi data lebih ketat
  const ticketData = {
    name: String(name || "").trim(),
    division: String(division || "").trim(),
    description: String(description || "").trim(),
    priority: String(division).trim().toLowerCase().includes("bod") ? "High" : "Normal"
  };

  console.log("🔄 Membuat tiket dengan data:", ticketData);

  // Validasi field required
  if (!ticketData.name || ticketData.name === 'User') {
    throw new Error("Nama tidak valid");
  }
  if (!ticketData.division || ticketData.division === 'Umum') {
    throw new Error("Divisi harus dipilih");
  }
  if (!ticketData.description || ticketData.description.length < 5) {
    throw new Error("Deskripsi keluhan harus diisi minimal 5 karakter");
  }

  const fd = new FormData();
  
  // Append dengan key yang tepat
  fd.append("name", ticketData.name);
  fd.append("division", ticketData.division);
  fd.append("priority", ticketData.priority);
  fd.append("description", ticketData.description);
  
  if (photo) {
    fd.append("photo", photo);
  }

  // Debug FormData secara detail
  console.log("📋 FormData contents:");
  for (let pair of fd.entries()) {
    console.log(`  ${pair[0]}:`, pair[1] ? (pair[0] === 'photo' ? `[File: ${pair[1].name}]` : `"${pair[1]}"`) : "EMPTY");
  }

  const url = apiUrl("/tickets");
  console.log("🌐 API URL:", url);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      body: fd,
      // ✅ JANGAN set Content-Type header untuk FormData
      // Browser akan otomatis set dengan boundary
    });

    console.log("📡 Response status:", response.status);
    
    // Handle error responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        // Jika response bukan JSON, baca sebagai text
        const text = await response.text();
        errorMessage = text || `HTTP ${response.status} - ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    // Handle success response
    const result = await response.json();
    console.log("✅ Ticket created successfully:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error creating ticket:", error);
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Gagal terhubung ke server. Pastikan backend dapat diakses dan mengizinkan CORS.`);
    }
    
    throw error;
  }
}

/** Ambil nama & departemen dari MSAL claims */
function readProfileFromMsal(accounts) {
  const a = accounts?.[0];
  const c = a?.idTokenClaims || {};
  const name = a?.name || c.name || c.given_name || a?.username || c.preferred_username || "User";
  const department = c.department || c.department || c.jobTitle || "Umum";
  return { 
    name: String(name || "User").trim(), 
    department: String(department || "Umum").trim() 
  };
}

/* ===================== sub-komponen UI ===================== */

// Server Time di Header
function ServerTimeHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="server-time-header">
      <div className="server-time-icon">⏰</div>
      <div className="server-time-content">
        <div className="server-time-value">
          {currentTime.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
        <div className="server-date">
          {currentTime.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
}

// Tombol Bantuan dengan gaya manusiawi
function HelpCTA({ onClick, disabled = false, isClicked = false }) {
  if (isClicked) {
    return null;
  }

  return (
    <div className="help-cta">
      <button 
        className={`help-btn ${disabled ? "disabled" : "pulse-animation"}`} 
        onClick={onClick}
        disabled={disabled}
      >
        <span className="btn-icon">💬</span>
        <span className="btn-text">Butuh Bantuan IT Support</span>
        <span className="btn-arrow">→</span>
      </button>
      <div className="help-hint">
        {disabled 
          ? "🔄 Sedang memulihkan koneksi..." 
          : "Klik untuk berbicara dengan tim IT support"
        }
      </div>
    </div>
  );
}

function ConnectionStatus({ isOnline, lastChecked }) {
  return (
    <div className={`connection-status ${isOnline ? "online" : "offline"}`}>
      <div className="status-indicator">
        <div className={`status-dot ${isOnline ? "online-dot" : "offline-dot"}`}></div>
      </div>
      <span className="status-text">
        {isOnline ? "Sistem Online" : "Sistem Offline"}
      </span>
      {lastChecked && (
        <span className="last-checked">
          • {lastChecked.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="typing-indicator">
      <div className="typing-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
      <div className="typing-text">sedang mengetik...</div>
    </div>
  );
}

function SuccessBig({ title = "Berhasil", subtitle = "" }) {
  return (
    <div className="success-card">
      <div className="success-icon">
        <div className="success-glow"></div>
        <svg className="check-icon" viewBox="0 0 52 52">
          <circle className="check-circle" cx="26" cy="26" r="25" fill="none"/>
          <path className="check-mark" fill="none" d="M14 27l7 7 17-17"/>
        </svg>
      </div>
      <div className="success-content">
        <div className="success-title">{title}</div>
        {subtitle && <div className="success-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

function RecapCard({ name, complaint, division, datetime }) {
  const priority = String(division).trim().toLowerCase().includes("bod") ? "High" : "Normal";
  return (
    <div className="recap">
      <div className="recap-header">
        <div className="recap-title">📋 Ringkasan Laporan</div>
        <div className="priority-badge">{priority}</div>
      </div>
      <div className="recap-grid">
        <div className="k">👤 Nama</div><div className="v">{name || "-"}</div>
        <div className="k">🏢 Divisi</div><div className="v">{division || "-"}</div>
        <div className="k">🎯 Prioritas</div><div className="v"><b className={`priority ${priority.toLowerCase()}`}>{priority}</b></div>
        <div className="k">💬 Keluhan</div><div className="v complaint">"{complaint || "-"}"</div>
        <div className="k">⏰ Tanggal & Waktu</div><div className="v">{datetime}</div>
      </div>
      <div className="recap-footer">
        <div className="note">Laporan ini telah dicatat oleh tim IT support</div>
      </div>
    </div>
  );
}

function UploadAsk({ onPick, hasPhoto, disabled = false }) {
  return (
    <div className="upload-ask">
      <div className="upload-prompt">
        <span className="icon">📸</span>
        Ingin melampirkan foto untuk membantu tim IT memahami masalahnya?
      </div>
      <button 
        className={`pill-btn upload-btn ${disabled ? "disabled" : ""}`} 
        onClick={onPick}
        disabled={disabled}
      >
        {hasPhoto ? "🔄 Ganti Foto" : "📷 Pilih Foto"}
      </button>
      {!hasPhoto && (
        <div className="upload-note">
          Opsional - Foto bisa membantu kami memahami masalah dengan lebih baik
        </div>
      )}
    </div>
  );
}

function DepartmentPicker({ current, onPick, disabled = false }) {
  return (
    <div className="department-picker">
      <div className="picker-header">
        <div className="department-picker-title">
          🎯 Pilih Divisi Tujuan
        </div>
        <div className="picker-subtitle">
          Kami akan mengarahkan laporan ke tim yang tepat
        </div>
      </div>
      
      <div className="department-grid-scroll">
        {DEPARTMENT_STRUCTURE.map((group, index) => (
          <div key={index} className="department-group">
            <div className="department-group-title">
              {group.title}
            </div>
            <div className="department-options">
              {group.options.map((option) => (
                <button
                  key={option}
                  className={`department-option ${option === current ? "option-active" : ""} ${disabled ? "disabled" : ""}`}
                  onClick={() => !disabled && onPick(option)}
                  disabled={disabled}
                >
                  <span className="option-text">{option}</span>
                  {option === current && (
                    <span className="option-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="department-picker-footer">
        <div className="department-note">
          {disabled ? (
            "🔄 Sedang memulihkan koneksi..."
          ) : (
            <>Saat ini: <b className="current">{current || "Umum"}</b> — Kami siap mengarahkan laporan</>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== komponen utama ===================== */
export default function ChatHost() {
  const { instance, accounts } = useMsal();

  // Test koneksi API
  const { isOnline, lastChecked, testConnection } = useApiConnectionTest();

  const displayName = useMemo(() => {
    const acc = accounts?.[0];
    const c = acc?.idTokenClaims || {};
    return acc?.name || c?.name || c?.preferred_username || acc?.username || "User";
  }, [accounts]);

  const { name: userName, department: userDepartment } = useMemo(
    () => readProfileFromMsal(accounts), [accounts]
  );

  // Nama-nama support agent yang natural
  const supportAgents = useMemo(() => [
    "Andi", "Budi", "Sari", "Dewi", "Rizky", "Putri", "Ahmad", "Maya"
  ], []);

  const [currentAgent] = useState(() => 
    supportAgents[Math.floor(Math.random() * supportAgents.length)]
  );

  // stages: start -> needComplaint -> confirmComplaint -> needDepartment -> needPhoto -> done
  const [stage, setStage] = useState("start");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [division, setDivision] = useState(userDepartment || "Umum");
  const [showChatInput, setShowChatInput] = useState(false);
  const [error, setError] = useState(null);
  const [helpButtonClicked, setHelpButtonClicked] = useState(false);

  // UI lock ketika tiket sudah dibuat atau server offline di awal
  const sessionLocked = stage === "done" || (!isOnline && stage === "start");

  // sticky confirm bar
  const [showConfirm, setShowConfirm] = useState(false);

  const scroller = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const pushBot  = (jsx) => {
    if (!mountedRef.current) return;
    setMessages((m) => Array.isArray(m) ? [...m, { side: "bot",  jsx }] : [{ side:"bot", jsx }]);
  };
  const pushUser = (text) => {
    if (!mountedRef.current) return;
    setMessages((m) => Array.isArray(m) ? [...m, { side: "user", jsx: <span>{text}</span> }] : [{ side:"user", jsx:<span>{text}</span>}]);
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
    });
  };
  useEffect(scrollToBottom, [messages, isTyping, showConfirm]);

  // Greeting awal dengan gaya manusia
  useEffect(() => {
    setMessages([]);
    setIsTyping(true);
    
    const greetings = [
      `Halo ${displayName}! 👋 Saya ${currentAgent} dari tim IT support. Ada yang bisa saya bantu hari ini?`,
      `Hai ${displayName}! 😊 Saya ${currentAgent}. Ada kendala IT yang perlu dibantu?`,
      `Selamat datang ${displayName}! 🤝 Saya ${currentAgent}, siap membantu masalah IT Anda.`
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
    setTimeout(() => {
      pushBot(
        <div className="welcome-message">
          <span className="agent-avatar">👨‍💻</span>
          <span>{randomGreeting}</span>
        </div>
      );
      
      if (!isOnline) {
        pushBot(
          <div className="warning-message">
            <strong>⚡ Perhatian:</strong> Saat ini sistem sedang offline. Saya akan mencatat laporan Anda sementara dan mengirimkannya saat koneksi pulih.
          </div>
        );
      }
      
      pushBot(
        <div className="fade-in cta-container">
          {isOnline 
            ? `Klik tombol di bawah untuk mulai berbicara dengan saya`
            : "Saya siap mencatat laporan Anda sementara"
          }
          <HelpCTA 
            onClick={startFlow} 
            disabled={sessionLocked}
            isClicked={helpButtonClicked}
          />
        </div>
      );
      setIsTyping(false);
      setStage("start");
      setShowChatInput(false);
      setError(null);
      setHelpButtonClicked(false);
      scrollToBottom();
    }, 800);
  }, [displayName, isOnline, currentAgent]);

  function startFlow() {
    if (sessionLocked) return;
    
    // Set tombol sudah diklik (akan menghilang)
    setHelpButtonClicked(true);

    if (!isOnline) {
      pushBot(
        <div className="warning-message">
          <strong>🌐 Mode Offline:</strong> Saya akan menyimpan laporan sementara dan mengirimkannya saat sistem online kembali.
        </div>
      );
    }

    setIsTyping(true);
    setTimeout(() => {
      pushUser("Butuh Bantuan IT Support");
      
      const botResponses = [
        `Oke! Silakan ceritakan detail masalah IT yang Anda hadapi. Saya akan bantu analisis dan arahkan ke tim yang tepat!`,
        `Baik! Coba deskripsikan masalahnya. Semakin detail, semakin mudah saya memahami dan membantu menyelesaikannya.`,
        `Siap! Silakan ceritakan masalah IT yang dialami - kapan mulai terjadi, gejalanya seperti apa, dan dampaknya bagaimana?`
      ];
      
      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
      
      pushBot(
        <div className="response-message">
          <span className="agent-avatar">👨‍💻</span>
          <span>{randomResponse}</span>
        </div>
      );
      setStage("needComplaint");
      setIsTyping(false);
      setShowChatInput(true);
      setError(null);
    }, 500);
  }

  const handleSend = () => {
    if (sessionLocked) return;
    const text = input.trim();
    if (!text) return;

    pushUser(text);
    setInput("");
    setError(null);

    if (stage === "start") {
      setIsTyping(true);
      setTimeout(() => {
        pushBot(
          <div className="response-message">
            <span className="agent-avatar">👨‍💻</span>
            <span>Untuk memulai, klik tombol <b>"Butuh Bantuan IT Support"</b> ya!</span>
          </div>
        );
        setIsTyping(false);
      }, 300);
      return;
    }

    if (stage === "needComplaint") {
      setComplaint(text);
      setIsTyping(true);
      setTimeout(() => {
        const confirmResponses = [
          `Saya memahami: "${text}" - Apakah ini sudah lengkap atau ada yang ingin ditambahkan?`,
          `Saya catat: "${text}" - Mau tambah detail atau sudah cukup untuk saya proses?`,
          `Saya pahami: "${text}" - Apakah ini sudah mencakup semua informasi yang perlu saya ketahui?`
        ];
        
        const randomConfirm = confirmResponses[Math.floor(Math.random() * confirmResponses.length)];
        
        pushBot(
          <div className="response-message">
            <span className="agent-avatar">👨‍💻</span>
            <span>
              {randomConfirm} 
              <br/><br/>
              Ketik <b>"ya"</b> untuk konfirmasi, <b>"tidak"</b> untuk merevisi
            </span>
          </div>
        );
        setStage("confirmComplaint");
        setIsTyping(false);
      }, 500);
      return;
    }

    if (stage === "confirmComplaint") {
      const lowerText = text.toLowerCase();
      
      if (yesWords.has(lowerText)) {
        setIsTyping(true);
        setTimeout(() => {
          pushBot(
            <DepartmentPicker
              current={division}
              onPick={(val) => {
                setDivision(val);
                pushUser(val);
                setIsTyping(true);
                setTimeout(() => {
                  const recapResponses = [
                    "Divisi dipilih! Ini ringkasan laporan yang sudah saya buat:",
                    "Target divisi sudah ditetapkan! Berikut ringkasan laporan Anda:",
                    "Baik! Saya telah memproses data. Ini ringkasan lengkap laporannya:"
                  ];
                  
                  const randomRecap = recapResponses[Math.floor(Math.random() * recapResponses.length)];
                  
                  pushBot(
                    <div className="response-message">
                      <span className="agent-avatar">👨‍💻</span>
                      <span>{randomRecap}</span>
                    </div>
                  );
                  pushBot(<RecapCard name={userName} complaint={complaint} division={val} datetime={nowStr()} />);
                  pushBot(
                    <UploadAsk 
                      onPick={() => fileInputRef.current?.click()} 
                      hasPhoto={!!photoFile}
                      disabled={!isOnline}
                    />
                  );
                  setStage("needPhoto");
                  setIsTyping(false);
                  
                  if (!isOnline) {
                    setShowConfirm(true);
                  }
                }, 400);
              }}
              disabled={!isOnline}
            />
          );
          setStage("needDepartment");
          setIsTyping(false);
        }, 400);
      } else if (noWords.has(lowerText)) {
        setIsTyping(true);
        setTimeout(() => {
          const retryResponses = [
            "Oke! Silakan tulis ulang keluhannya dengan lebih detail:",
            "Baik! Mari perbaiki deskripsinya. Silakan ceritakan lagi dengan lebih lengkap:",
            "Saya pahami! Silakan revisi penjelasan masalahnya:"
          ];
          
          const randomRetry = retryResponses[Math.floor(Math.random() * retryResponses.length)];
          
          pushBot(
            <div className="response-message">
              <span className="agent-avatar">👨‍💻</span>
              <span>{randomRetry}</span>
            </div>
          );
          setStage("needComplaint");
          setIsTyping(false);
        }, 400);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          pushBot(
            <div className="response-message">
              <span className="agent-avatar">👨‍💻</span>
              <span>
                Maaf, saya kurang paham. Ketik <b>"ya"</b> untuk konfirmasi, atau <b>"tidak"</b> untuk merevisi keluhan
              </span>
            </div>
          );
          setIsTyping(false);
        }, 400);
      }
      return;
    }

    if (stage === "needDepartment") return;
    if (stage === "needPhoto") return;
  };

  const onKeyDown = (e) => {
    if (sessionLocked) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran file terlalu besar. Maksimal 5MB.");
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Hanya file gambar yang diizinkan.");
      return;
    }

    setPhotoFile(f);
    setError(null);

    const url = URL.createObjectURL(f);
    pushBot(
      <div className="img-preview">
        <div className="image-header">🖼️ Foto Terlampir</div>
        <img src={url} alt="Preview lampiran" onLoad={() => URL.revokeObjectURL(url)} />
        <div className="img-caption">Terima kasih, foto ini akan membantu kami memahami masalah</div>
      </div>
    );
    
    setIsTyping(true);
    setTimeout(() => {
      pushBot(
        <div className="response-message">
          <span className="agent-avatar">👨‍💻</span>
          <span>Foto berhasil diupload! Ini akan sangat membantu tim teknis</span>
        </div>
      );
      setIsTyping(false);
    }, 400);

    setShowConfirm(true);
  };

  // Helper untuk convert file ke base64 (offline mode)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Helper untuk mendapatkan URL foto lengkap dari backend
  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    
    if (photoPath.startsWith('http')) {
      return photoPath;
    }
    
    const baseUrl = getBaseUrl();
    return `${baseUrl}${photoPath}`;
  };

  async function submitTicket() {
    if (submitting || stage === "done") return;

    try {
      setSubmitting(true);
      setError(null);
      
      // Validasi data sebelum dikirim
      const ticketData = {
        name: userName || "User",
        division: division || "Umum",
        description: complaint || "",
        photo: photoFile
      };

      console.log("📤 Data tiket yang akan dikirim:", ticketData);

      // Validasi ketat sebelum kirim
      if (!ticketData.name || ticketData.name === "User") {
        throw new Error("Nama tidak valid - silakan login ulang");
      }
      if (!ticketData.division || ticketData.division === "Umum") {
        throw new Error("Silakan pilih divisi yang sesuai");
      }
      if (!ticketData.description || ticketData.description.trim().length < 5) {
        throw new Error("Deskripsi keluhan harus diisi minimal 5 karakter");
      }

      if (isOnline) {
        pushBot(<TypingDots />);

        console.log("🚀 Mengirim tiket ke server...");
        const res = await createTicket({
          name: ticketData.name,
          division: ticketData.division,
          description: ticketData.description,
          photo: ticketData.photo
        });

        setSubmitting(false);

        // Remove typing indicator
        setMessages((m) => {
          const arr = m.slice();
          if (arr.length && String(arr[arr.length - 1]?.jsx?.type?.name || "") === "TypingDots") arr.pop();
          return arr;
        });

        setShowConfirm(false);
        setStage("done");

        // Show success message
        pushBot(
          <SuccessBig
            title="✅ Laporan Berhasil Dikirim!"
            subtitle={`Nomor tiket: ${res?.ticket?.ticketNo || res?.ticketId || "-"}`}
          />
        );

        const closingMessages = [
          "Terima kasih! Laporan Anda sudah kami terima. Tim IT akan segera menghubungi Anda.",
          "Laporan berhasil dikirim! Kami akan memprosesnya dan memberikan update secepatnya.",
          "Sukses! Tiket sudah dibuat. Tim teknis akan menindaklanjuti sesuai prioritas."
        ];
        
        const randomClosing = closingMessages[Math.floor(Math.random() * closingMessages.length)];
        
        pushBot(
          <div className="response-message">
            <span className="agent-avatar">👨‍💻</span>
            <span>{randomClosing}</span>
          </div>
        );
      } else {
        // Offline mode handling
        const offlineTicket = {
          name: ticketData.name,
          division: ticketData.division,
          description: ticketData.description,
          photo: ticketData.photo ? await fileToBase64(ticketData.photo) : null,
          createdAt: new Date().toISOString(),
          status: 'pending'
        };

        const existingTickets = JSON.parse(localStorage.getItem('offlineTickets') || '[]');
        existingTickets.push(offlineTicket);
        localStorage.setItem('offlineTickets', JSON.stringify(existingTickets));

        setSubmitting(false);
        setShowConfirm(false);
        setStage("done");

        pushBot(
          <SuccessBig
            title="💾 Laporan Disimpan (Offline)"
            subtitle="Akan otomatis terkirim saat online"
          />
        );

        pushBot(
          <div className="response-message">
            <span className="agent-avatar">👨‍💻</span>
            <span>
              Laporan sudah saya simpan! Nanti akan otomatis terkirim saat koneksi pulih. 
              Terima kasih atas kesabarannya.
            </span>
          </div>
        );
      }
    } catch (err) {
      setSubmitting(false);
      setError(err.message);

      console.error("❌ Error dalam submitTicket:", err);

      // Remove typing indicator
      setMessages((m) => {
        const arr = m.slice();
        if (arr.length && String(arr[arr.length - 1]?.jsx?.type?.name || "") === "TypingDots") arr.pop();
        return arr;
      });

      pushBot(
        <div className="error-message">
          <div className="error-header">❌ Gagal Mengirim Laporan</div>
          <div className="error-detail">{String(err?.message || "Terjadi kendala tidak terduga")}</div>
          <div className="error-suggestion">
            Silakan cek koneksi internet atau hubungi IT support langsung
          </div>
        </div>
      );
    }
  }

  const handleLogout = async () => {
    try {
      await instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
    } catch {
      await instance.logoutPopup({ postLogoutRedirectUri: window.location.origin });
    }
  };

  const retryConnection = async () => {
    setIsTyping(true);
    pushBot(
      <div className="response-message">
        <span className="agent-avatar">👨‍💻</span>
        <span>Sedang memeriksa koneksi server...</span>
      </div>
    );
    
    try {
      const connected = await testConnection();
      
      setIsTyping(false);
      if (connected) {
        pushBot(
          <div className="success-message">
            <strong>✅ Koneksi Berhasil!</strong> Sistem sudah kembali online!
          </div>
        );
        
        if (!isOnline) {
          window.location.reload();
        }
      } else {
        pushBot(
          <div className="error-message">
            <div className="error-header">🌐 Masih Offline</div>
            <div className="error-detail">
              Pastikan backend di <code>https://it-backend-production.up.railway.app</code> aktif
            </div>
          </div>
        );
      }
    } catch (error) {
      setIsTyping(false);
      pushBot(
        <div className="error-message">
          <div className="error-header">⚡ Error Koneksi</div>
          <div className="error-detail">{error.message}</div>
        </div>
      );
    }
  };

  return (
    <div className="chat-root">
      {/* Background Elements */}
      <div className="human-background-elements">
        <div className="human-floating-orb orb-1"></div>
        <div className="human-floating-orb orb-2"></div>
        <div className="human-floating-orb orb-3"></div>
        <div className="human-network-lines"></div>
      </div>

      {/* Header */}
      <div className="chat-header">
        <div className="chat-peer">
          <div className="avatar">👨‍💻</div>
          <div className="peer-info">
            <div className="peer-name">IT Support - {currentAgent}</div>
            <ConnectionStatus isOnline={isOnline} lastChecked={lastChecked} />
          </div>
        </div>

        <div className="header-right">
          <ServerTimeHeader />
          <div className="user-mini">
            <span className="user-name">{userName}</span>
            <span className="user-department">{division}</span>
          </div>
          {!isOnline && (
            <button className="retry-btn" onClick={retryConnection} title="Coba koneksi lagi">
              🔄 Retry
            </button>
          )}
          <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 17l5-5-5-5v3H9v4h7v3zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z"/>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Area Pesan */}
      <div className="chat-body" ref={scroller}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.side}`}>
            <div className={`bubble ${m.side === "user" ? "me user-message" : "bot bot-message"}`}>
              {m.jsx}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="row bot">
            <div className="bubble bot">
              <TypingDots />
            </div>
          </div>
        )}

        {/* Input file tersembunyi */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          style={{ display: "none" }}
          disabled={!isOnline}
        />
      </div>

      {/* Sticky Confirm Bar */}
      {showConfirm && stage !== "done" && (
        <div className="confirm-sticky">
          <button
            className="confirm-btn"
            onClick={submitTicket}
            disabled={submitting}
            aria-disabled={submitting}
          >
            {submitting 
              ? "⏳ Mengirim..." 
              : isOnline 
                ? "✅ Konfirmasi & Kirim Laporan" 
                : "💾 Simpan Sementara"
            }
          </button>
        </div>
      )}

      {/* Input Bar */}
      <div className={`chat-inputbar ${!showChatInput || sessionLocked ? "hidden" : ""}`}>
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sessionLocked || !showChatInput}
          placeholder={
            !isOnline && stage === "start" ? "Sistem sedang offline - tunggu koneksi..." :
            sessionLocked ? "✅ Laporan sudah selesai!" : 
            "Ketik pesan... (Enter untuk kirim)"
          }
          aria-label="Ketik pesan"
          className="input-field"
        />
        <button
          className="send-btn"
          onClick={handleSend}
          aria-label="Kirim pesan"
          disabled={sessionLocked || !showChatInput || !input.trim()}
        >
          <span className="send-icon">📤</span>
          Kirim
        </button>
      </div>
    </div>
  );
}