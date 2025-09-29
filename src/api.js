// src/utils/api.js
const API_BASE = process.env.REACT_APP_API_BASE_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 'https://it-backend-production.up.railway.app/api/';

console.log('API Base URL:', API_BASE);

// Fungsi helper untuk fetch API
async function fetchAPI(endpoint, options = {}) {
  // Normalize endpoint (remove leading slash if present)
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE}${normalizedEndpoint}`;
  
  console.log('API Call:', url, 'Options:', options);

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // credentials: 'include', // Hapus atau comment ini untuk avoid CORS issues
    ...options,
  };

  // Jika menggunakan FormData, hapus Content-Type agar browser set otomatis
  if (options.body && options.body instanceof FormData) {
    delete config.headers['Content-Type'];
    // Jangan gunakan credentials dengan FormData untuk avoid CORS
    delete config.credentials;
  }

  try {
    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        console.error('API Error Response:', errorText);
      } catch (e) {
        errorText = response.statusText;
      }
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    // Handle case where response might be empty
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      const text = await response.text();
      return text ? { message: text } : { success: true };
    }
  } catch (error) {
    console.error('API call failed:', error);
    
    // Handle specific CORS error
    if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Please check if the server is running and CORS is configured properly.');
    }
    
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

  // Debug FormData contents
  for (let [key, value] of fd.entries()) {
    console.log(`FormData: ${key} =`, value instanceof File ? `File: ${value.name}` : value);
  }

  return fetchAPI('tickets', {
    method: 'POST',
    body: fd
    // credentials dihapus untuk avoid CORS
  });
}

export async function getTickets(params = {}) {
  const queryParams = new URLSearchParams();
  
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  
  const queryString = queryParams.toString();
  const endpoint = queryString ? `tickets?${queryString}` : 'tickets';
  
  return fetchAPI(endpoint);
}

export async function getTicketById(id) {
  return fetchAPI(`tickets/${id}`);
}

// Helper function untuk handle photo data dari backend
export function getPhotoUrl(photoData) {
  if (!photoData) return null;
  
  // Jika photoData adalah string URL
  if (typeof photoData === 'string') {
    // Jika sudah full URL
    if (photoData.startsWith('http')) {
      return photoData;
    }
    // Jika relative path
    if (photoData.startsWith('/')) {
      return `https://it-backend-production.up.railway.app${photoData}`;
    }
    return photoData;
  }
  
  // Jika photoData adalah object (base64 dari backend saat ini)
  if (typeof photoData === 'object' && photoData.data && photoData.contentType) {
    // Convert base64 ke data URL untuk sementara
    return `data:${photoData.contentType};base64,${photoData.data}`;
  }
  
  return null;
}

export async function resolveTicket(id, data) {
  return fetchAPI(`tickets/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function declineTicket(id, data) {
  return fetchAPI(`tickets/${id}/decline`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function deleteTicket(id) {
  return fetchAPI(`tickets/${id}`, {
    method: 'DELETE'
  });
}

export async function getDashboardStats() {
  return fetchAPI('dashboard/stats');
}

// API functions untuk Inventory
export async function getDevices() {
  return fetchAPI('devices');
}

export async function getLicenses() {
  return fetchAPI('licenses');
}

export async function getPeripherals() {
  return fetchAPI('peripherals');
}

// Health check
export async function healthCheck() {
  return fetchAPI('health');
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