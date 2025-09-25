// src/authConfig.js

/**
 * Konfigurasi MSAL untuk Azure AD Authentication
 * - Fixed redirect URI untuk production dan development
 */

export function getMsalConfig(persistent = true) {
  // Gunakan environment variables
  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID;
  const authority = process.env.REACT_APP_MSAL_AUTHORITY;
  
  // PERBAIKAN: Logic yang lebih robust untuk detect environment
  const getRedirectUri = () => {
    // Priority 1: Environment variable (paling tinggi)
    if (process.env.REACT_APP_MSAL_REDIRECT_URI) {
      return process.env.REACT_APP_MSAL_REDIRECT_URI;
    }
    
    // Priority 2: Detect berdasarkan hostname
    if (typeof window !== 'undefined') {
      const currentHost = window.location.origin;
      
      // Jika di production domain
      if (currentHost.includes('it.waskitainfrastruktur.co.id')) {
        return currentHost;
      }
      
      // Jika di localhost
      if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
        return 'http://localhost:8080';
      }
      
      // Fallback ke current host
      return currentHost;
    }
    
    // Priority 3: Fallback berdasarkan NODE_ENV
    if (process.env.NODE_ENV === 'production') {
      return 'https://it.waskitainfrastruktur.co.id';
    }
    
    // Default development
    return 'http://localhost:8080';
  };
  
  const redirectUri = getRedirectUri();
  
  // Validasi config
  if (!clientId) {
    console.error('❌ REACT_APP_MSAL_CLIENT_ID tidak ditemukan');
  }
  
  if (!authority) {
    console.error('❌ REACT_APP_MSAL_AUTHORITY tidak ditemukan');
  }

  console.log('🔧 MSAL Configuration:', {
    environment: process.env.NODE_ENV,
    clientId: clientId ? '✅ Set' : '❌ Missing',
    authority: authority ? '✅ Set' : '❌ Missing',
    redirectUri: redirectUri,
    nodeEnv: process.env.NODE_ENV
  });

  return {
    auth: {
      clientId: clientId,
      authority: authority,
      redirectUri: redirectUri,
      postLogoutRedirectUri: redirectUri,
      navigateToLoginRequestUrl: false,
    },
    cache: {
      cacheLocation: persistent ? "localStorage" : "sessionStorage",
      storeAuthStateInCookie: true,
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          if (level === 0) console.error('MSAL Error:', message);
          else if (level === 1) console.warn('MSAL Warning:', message);
          else if (level === 2) console.info('MSAL Info:', message);
          else if (level === 3) console.debug('MSAL Debug:', message);
        },
        piiLoggingEnabled: false
      },
      windowHashTimeout: 60000,
      iframeHashTimeout: 6000,
      loadFrameTimeout: 10000
    }
  };
}

// Scopes untuk login
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account"
};

// Request untuk redirect flow
export const redirectRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account"
};

// Scopes untuk silent login
export const silentRequest = {
  scopes: ["User.Read"],
  forceRefresh: false
};

// Export config default
export const msalConfig = getMsalConfig(true);

// Helper untuk validasi config
export function validateMsalConfig() {
  const config = msalConfig.auth;
  const errors = [];
  
  if (!config.clientId) {
    errors.push('REACT_APP_MSAL_CLIENT_ID tidak ditemukan');
  }
  
  if (!config.authority) {
    errors.push('REACT_APP_MSAL_AUTHORITY tidak ditemukan');
  }
  
  if (!config.redirectUri) {
    errors.push('Redirect URI tidak valid');
  }
  
  // Validasi khusus untuk production
  if (process.env.NODE_ENV === 'production') {
    if (config.redirectUri.includes('localhost')) {
      errors.push('❌ Redirect URI masih mengarah ke localhost di production!');
    }
    
    if (!config.redirectUri.startsWith('https://')) {
      errors.push('❌ Redirect URI harus HTTPS di production');
    }
  }
  
  if (errors.length > 0) {
    console.error('MSAL Config Errors:', errors);
    return false;
  }
  
  console.log('✅ MSAL Config valid untuk environment:', process.env.NODE_ENV);
  console.log('📍 Redirect URI:', config.redirectUri);
  return true;
}

// Cek config saat module load
if (typeof window !== 'undefined') {
  validateMsalConfig();
}