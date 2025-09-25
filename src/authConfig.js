// src/authConfig.js

/**
 * Konfigurasi MSAL untuk Azure AD Authentication
 * Compatible dengan @azure/msal-browser v4.x
 */

export function getMsalConfig(persistent = true) {
  // Gunakan environment variables
  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || "f536a53d-8a16-45cf-9acf-d8c77212b605";
  const authority = process.env.REACT_APP_MSAL_AUTHORITY || "https://login.microsoftonline.com/94526da5-8783-4516-9eb7-8c58bbf66a2d";
  
  // Redirect URI detection
  const getRedirectUri = () => {
    // Priority 1: Environment variable
    if (process.env.REACT_APP_MSAL_REDIRECT_URI) {
      return process.env.REACT_APP_MSAL_REDIRECT_URI;
    }
    
    // Priority 2: Current hostname
    if (typeof window !== 'undefined') {
      const currentHost = window.location.origin;
      
      // Production domain
      if (currentHost.includes('it.waskitainfrastruktur.co.id')) {
        return currentHost;
      }
      
      // Local development
      if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
        return process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:8080';
      }
      
      return currentHost;
    }
    
    // Priority 3: Fallback based on NODE_ENV
    return process.env.NODE_ENV === 'production' 
      ? 'https://it.waskitainfrastruktur.co.id'
      : 'http://localhost:8080';
  };
  
  const redirectUri = getRedirectUri();

  console.log('🔧 MSAL Configuration Loaded:', {
    environment: process.env.NODE_ENV,
    clientId: clientId ? '✅ Set' : '❌ Missing',
    authority: authority ? '✅ Set' : '❌ Missing',
    redirectUri: redirectUri,
    cacheLocation: persistent ? 'localStorage' : 'sessionStorage'
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
          if (process.env.NODE_ENV === 'development') {
            if (level === 0) console.error('🔴 MSAL Error:', message);
            else if (level === 1) console.warn('🟡 MSAL Warning:', message);
            else if (level === 2) console.info('🔵 MSAL Info:', message);
          }
        },
        piiLoggingEnabled: false
      }
    }
  };
}

// Login request configuration
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account"
};

// Silent request configuration
export const silentRequest = {
  scopes: ["User.Read"],
  forceRefresh: false
};

// Export default config
export const msalConfig = getMsalConfig(true);

// Validasi configuration
export function validateMsalConfig() {
  const config = msalConfig.auth;
  const errors = [];
  
  if (!config.clientId) {
    errors.push('REACT_APP_MSAL_CLIENT_ID is required');
  }
  
  if (!config.authority) {
    errors.push('REACT_APP_MSAL_AUTHORITY is required');
  }
  
  if (!config.redirectUri) {
    errors.push('Redirect URI is required');
  }
  
  if (errors.length > 0) {
    console.error('❌ MSAL Configuration Errors:', errors);
    return false;
  }
  
  console.log('✅ MSAL Configuration is valid');
  return true;
}

// Auto-validate in browser context
if (typeof window !== 'undefined') {
  validateMsalConfig();
}