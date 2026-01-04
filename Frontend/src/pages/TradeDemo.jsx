// src/pages/TradeDemo.jsx
// Update these constants at the top of the file:

const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';

// ✅ Use relative paths in production, full URLs in development
const DEMO_API_DEFAULT = isProduction 
  ? '/bot-api/api'  // Relative path that matches your nginx config
  : resolveCryptoBase(
      getEnvVar("VITE_DEMO_API", "REACT_APP_DEMO_API"),
      "http://localhost:5055"  // Default dev server
    );

const LIVE_API_DEFAULT = isProduction
  ? '/bot-api/api'  // Same relative path
  : resolveCryptoBase(
      getEnvVar("VITE_LIVE_API", "REACT_APP_LIVE_API"),
      "http://localhost:5055"
    );

// Update TG_NOTIFY_URL_DEFAULT too
const TG_NOTIFY_URL_DEFAULT = isProduction
  ? '/bot-api/api'  // Relative path
  : getEnvVar("VITE_TG_NOTIFY_URL", "REACT_APP_TG_NOTIFY_URL") ||
    getEnvVar("VITE_TG_NOTIFY_BASE", "REACT_APP_TG_NOTIFY_BASE") ||
    "http://localhost:5055";

// Stocks APIs
const STOCK_DEMO_API_DEFAULT = isProduction
  ? '/bot-api/api'  // Relative path
  : getEnvVar("VITE_STOCK_DEMO_API", "REACT_APP_STOCK_DEMO_API") || "";

const STOCK_LIVE_API_DEFAULT = isProduction
  ? '/bot-api/api'  // Relative path
  : getEnvVar("VITE_STOCK_LIVE_API", "REACT_APP_STOCK_LIVE_API") || "";