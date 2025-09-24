const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

// Fungsi helper untuk fetch API
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Handle FormData (jika ada, hapus Content-Type agar browser set otomatis)
  if (options.body && options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// API functions
export async function createTicket({ name, division, description, photoFile, priority }) {
  const fd = new FormData();
  if (name) fd.append('name', name);
  if (division) fd.append('division', division);
  if (priority) fd.append('priority', priority);
  fd.append('description', description || '');
  if (photoFile) fd.append('photo', photoFile);

  const r = await fetchAPI('/tickets', {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    throw new Error(r?.error || `Failed to create ticket`);
  }
  return r; // { ok:true, row, ticketId }
}

// Tambahkan fungsi API lainnya sesuai kebutuhan
export async function getDevices() {
  return fetchAPI('/devices');
}

export async function getLicenses() {
  return fetchAPI('/licenses');
}

export async function getPeripherals() {
  return fetchAPI('/peripherals');
}

export async function getTickets() {
  return fetchAPI('/helpdesk/tickets');
}

export async function updateTicket(id, data) {
  return fetchAPI(`/helpdesk/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteTicket(id) {
  return fetchAPI(`/helpdesk/tickets/${id}`, {
    method: 'DELETE'
  });
}

export { API_BASE };