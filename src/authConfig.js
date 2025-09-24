// authConfig.js
export function getMsalConfig(persistent = true) {
  // Gunakan environment variables dengan fallback values untuk development
  const clientId = process.env.REACT_APP_MSAL_CLIENT_ID || "f536a53d-8a16-45cf-9acf-d8c77212b605";
  const authority = process.env.REACT_APP_MSAL_AUTHORITY || "https://login.microsoftonline.com/94526da5-8783-4516-9eb7-8c58bbf66a2d";
  const redirectUri = process.env.REACT_APP_MSAL_REDIRECT_URI || `${window.location.origin}`;
  
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
  };
}

export const loginRequest = {
  scopes: ["User.Read", "Sites.Read.All", "Sites.ReadWrite.All"],
};

// Export config default untuk memudahkan import
export const msalConfig = getMsalConfig(true);