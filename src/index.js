import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AppProvider from "./AppProvider";
import App from "./App";
import "./index.css";

// Function untuk enable mocking hanya di development
async function enableMocking() {
  // Hanya enable di development dan jika bukan production build
  if (process.env.NODE_ENV !== 'development' || process.env.REACT_APP_ENABLE_MSW !== 'true') {
    console.log('MSW disabled');
    return;
  }

  try {
    const { worker } = await import('./mocks/browser');
    
    // Mulai MSW worker
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('MSW enabled');
  } catch (error) {
    console.error('Failed to enable MSW:', error);
  }
}

// Enable mocking then render React app
enableMocking().finally(() => {
  const root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  );
});