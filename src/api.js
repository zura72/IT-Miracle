// src/utils/api.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 'http://localhost:4000/api';

console.log('API Base URL:', API_BASE); // Debugging

// Fungsi helper untuk fetch API
async function fetchAPI(endpoint, options = {}) {
  // Normalize endpoint (remove leading slash if present)
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${normalizedEndpoint}`;
  
  console.log('API Call:', url); // Debugging

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
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// API functions untuk Helpdesk Tickets
export async function createTicket(ticketData) {
  const { name, division, description, photo, priority } = ticketData;
  
  const fd = new FormData();
  fd.append('name', name || '');
  fd.append('division', division || '');
  fd.append('description', description || '');
  fd.append('priority', priority || 'Normal');
  
  if (photo) {
    fd.append('photo', photo);
  }

  console.log('Creating ticket with data:', {
    name, division, description, priority, hasPhoto: !!photo
  });

  return fetchAPI('/tickets', {
    method: 'POST',
    body: fd,
  });
}

export async function getTickets(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `/tickets?${queryString}` : '/tickets';
  
  return fetchAPI(endpoint);
}

export async function getTicketById(id) {
  return fetchAPI(`/tickets/${id}`);
}

export async function resolveTicket(id, data) {
  return fetchAPI(`/tickets/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function declineTicket(id, data) {
  return fetchAPI(`/tickets/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteTicket(id) {
  return fetchAPI(`/tickets/${id}`, {
    method: 'DELETE'
  });
}

export async function getDashboardStats() {
  return fetchAPI('/dashboard/stats');
}

// API functions untuk Inventory (jika diperlukan)
export async function getDevices() {
  return fetchAPI('/devices');
}

export async function getLicenses() {
  return fetchAPI('/licenses');
}

export async function getPeripherals() {
  return fetchAPI('/peripherals');
}

// Health check
export async function healthCheck() {
  return fetchAPI('/health');
}

// Test connection
export async function testConnection() {
  try {
    const result = await healthCheck();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export { API_BASE };