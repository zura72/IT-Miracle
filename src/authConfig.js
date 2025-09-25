// authConfig.js

/**
 * Konfigurasi MSAL untuk Azure AD Authentication
 * - Fixed scopes yang lebih minimal
 * - Better configuration untuk production
 */

export function getMsalConfig(persistent = true) {
  // Gunakan environment variables dengan fallback values
  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || "f536a53d-8a16-45cf-9acf-d8c77212b605";
  const authority = process.env.REACT_APP_MSAL_AUTHORITY || "https://login.microsoftonline.com/94526da5-8783-4516-9eb7-8c58bbf66a2d";
  
  // Redirect URI harus absolute URL untuk production
  const redirectUri = process.env.REACT_APP_MSAL_REDIRECT_URI || 
                     (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  
  // Validasi clientId untuk prevent error
  if (!clientId || clientId.length < 10) {
    console.error('MSAL Client ID tidak valid:', clientId);
  }

  return {
    auth: {
      clientId: clientId,
      authority: authority,
      redirectUri: redirectUri,
      postLogoutRedirectUri: redirectUri,
      navigateToLoginRequestUrl: false, // DIUBAH: false agar tidak navigate ke Microsoft URL
    },
    cache: {
      cacheLocation: persistent ? "localStorage" : "sessionStorage",
      storeAuthStateInCookie: true, // Penting untuk browser yang tidak support third-party cookies
    },
    system: {
      loggerOptions: {
        loggerCallback: (level, message, containsPii) => {
          if (containsPii) return;
          if (level === 0) console.error(message);
          else if (level === 1) console.warn(message);
          else if (level === 2) console.info(message);
          else if (level === 3) console.debug(message);
        },
        piiLoggingEnabled: false
      },
      windowHashTimeout: 60000,
      iframeHashTimeout: 6000,
      loadFrameTimeout: 10000
    }
  };
}

// Scopes yang lebih minimal dan sesuai kebutuhan
export const loginRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account"
};

// Request untuk redirect flow (tambahan)
export const redirectRequest = {
  scopes: ["User.Read", "openid", "profile"],
  prompt: "select_account",
  redirectStartPage: window.location.origin // Tambahkan ini
};

// Scopes untuk silent login (lebih terbatas)
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
  
  if (!config.clientId || config.clientId.length < 10) {
    errors.push('Client ID tidak valid');
  }
  
  if (!config.authority || !config.authority.includes('microsoftonline.com')) {
    errors.push('Authority tidak valid');
  }
  
  if (!config.redirectUri) {
    errors.push('Redirect URI tidak valid');
  }
  
  if (errors.length > 0) {
    console.warn('MSAL Config warnings:', errors);
    return false;
  }
  
  return true;
}

// Cek config saat module load
if (typeof window !== 'undefined') {
  validateMsalConfig();
}