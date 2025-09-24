import { http, HttpResponse } from 'msw';

const mockTickets = [
  {
    id: 1,
    ticketNo: "TKT-001",
    createdAt: new Date().toISOString(),
    name: "John Doe",
    division: "IT",
    priority: "Urgent",
    description: "Keyboard tidak berfungsi",
    status: "Belum",
    assignee: "Admin"
  }
];

export const handlers = [
  http.get('/api/tickets', () => {
    return HttpResponse.json({
      rows: mockTickets,
      count: mockTickets.length
    });
  }),
  http.post('/api/tickets/:id/resolve', () => {
    return HttpResponse.json({ message: "Ticket resolved successfully" });
  }),
  http.post('/api/tickets/:id/decline', () => {
    return HttpResponse.json({ message: "Ticket declined successfully" });
  }),
  http.delete('/api/tickets/:id', () => {
    return HttpResponse.json({ message: "Ticket deleted successfully" });
  })
];