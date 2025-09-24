// mock-api.js
const express = require('express');
const app = express();
app.use(express.json());

// Simpan data tiket dalam memori
let tickets = [
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

// Middleware untuk CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:8080');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Endpoint untuk mendapatkan tiket
app.get('/api/tickets', (req, res) => {
  const status = req.query.status;
  let filteredTickets = tickets;
  
  if (status) {
    filteredTickets = tickets.filter(ticket => ticket.status === status);
  }
  
  res.json({
    rows: filteredTickets,
    count: filteredTickets.length
  });
});

// Endpoint untuk resolve tiket
app.post('/api/tickets/:id/resolve', (req, res) => {
  const ticketId = parseInt(req.params.id);
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  
  if (ticketIndex !== -1) {
    tickets[ticketIndex].status = "Selesai";
    res.json({ message: "Ticket resolved successfully", ticket: tickets[ticketIndex] });
  } else {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Endpoint untuk decline tiket
app.post('/api/tickets/:id/decline', (req, res) => {
  const ticketId = parseInt(req.params.id);
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  
  if (ticketIndex !== -1) {
    tickets[ticketIndex].status = "Ditolak";
    res.json({ message: "Ticket declined successfully", ticket: tickets[ticketIndex] });
  } else {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Endpoint untuk delete tiket
app.delete('/api/tickets/:id', (req, res) => {
  const ticketId = parseInt(req.params.id);
  const ticketIndex = tickets.findIndex(t => t.id === ticketId);
  
  if (ticketIndex !== -1) {
    tickets.splice(ticketIndex, 1);
    res.json({ message: "Ticket deleted successfully" });
  } else {
    res.status(404).json({ error: "Ticket not found" });
  }
});

// Jalankan server pada port 3001
app.listen(3001, () => {
  console.log('Mock API server running on port 3001');
});