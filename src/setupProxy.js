// src/setupProxy.js
const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // KOMENTARI ATAU HAPUS proxy untuk backend yang sudah tidak ada
  /*
  app.use(
    "/api",
    createProxyMiddleware({
      target: process.env.REACT_APP_API_BASE_URL || "http://localhost:4000",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "/api",
      },
      onProxyReq: (proxyReq, req) => {
        console.log("[PROXY] Proxying request:", req.method, req.url);
      },
      onError: (err, req, res) => {
        console.error("[PROXY ERROR]", err);
        res.status(500).json({ error: "Proxy error" });
      }
    })
  );

  app.use(
    "/uploads",
    createProxyMiddleware({
      target: process.env.REACT_APP_API_BASE_URL || "http://localhost:4000",
      changeOrigin: true,
    })
  );
  */
  
  // Tambahkan middleware untuk menangani API calls dengan mock data
  app.use("/api", (req, res, next) => {
    console.log("[MOCK API] Handling:", req.method, req.url);
    
    // Simulasi delay jaringan
    setTimeout(() => {
      // Handle berbagai endpoint API
      if (req.method === "GET" && req.url.includes("/tickets")) {
        const status = new URLSearchParams(req.url.split('?')[1]).get('status');
        
        const mockTickets = [
          {
            id: 1,
            ticketNo: "TKT-001",
            createdAt: new Date().toISOString(),
            name: "John Doe",
            division: "IT",
            priority: "Urgent",
            description: "Keyboard tidak berfungsi",
            status: "Belum"
          },
          {
            id: 2,
            ticketNo: "TKT-002",
            createdAt: new Date().toISOString(),
            name: "Jane Smith",
            division: "HR",
            priority: "High",
            description: "Printer bermasalah",
            status: "Belum"
          },
          {
            id: 3,
            ticketNo: "TKT-003",
            createdAt: new Date().toISOString(),
            name: "Bob Johnson",
            division: "Finance",
            priority: "Normal",
            description: "Software installation needed",
            status: "Belum"
          }
        ];
        
        let filteredTickets = mockTickets;
        if (status) {
          filteredTickets = mockTickets.filter(ticket => ticket.status === status);
        }
        
        return res.json({
          rows: filteredTickets,
          count: filteredTickets.length
        });
      }
      
      // Handle POST /api/tickets/:id/resolve
      else if (req.method === "POST" && req.url.includes("/resolve")) {
        const ticketId = parseInt(req.url.split('/')[2]);
        return res.json({ 
          message: "Ticket resolved successfully", 
          ticket: { id: ticketId, status: "Selesai" } 
        });
      }
      
      // Handle POST /api/tickets/:id/decline
      else if (req.method === "POST" && req.url.includes("/decline")) {
        const ticketId = parseInt(req.url.split('/')[2]);
        return res.json({ 
          message: "Ticket declined successfully", 
          ticket: { id: ticketId, status: "Ditolak" } 
        });
      }
      
      // Handle DELETE /api/tickets/:id
      else if (req.method === "DELETE") {
        const ticketId = parseInt(req.url.split('/').pop());
        return res.json({ message: "Ticket deleted successfully" });
      }
      
      // Default response untuk API yang tidak dikenali
      else {
        res.status(404).json({ error: "API endpoint not found" });
      }
    }, 300); // Simulasi delay 300ms
  });
};