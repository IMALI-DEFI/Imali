// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Environment Helpers
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

function getEnv(key, fallback = "") {
  if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
    return process.env[key] || fallback;
  }

  if (IS_BROWSER) {
    if (window.__ENV?.[key] !== undefined) return window.__ENV[key];
    if (window[key] !== undefined) return window[key];
    if (window.process?.env?.[key]) return window.process.env[key];
  }

  return fallback;
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

/* ======================================================
   API Origin Resolver
====================================================== */
function resolveApiOrigin() {
  const raw =
    getEnv("API_BASE_URL") ||
    getEnv("VITE_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE") ||
    "";

  if (raw) {
    const cleaned = stripTrailingSlash(raw);
    return cleaned.endsWith("/api") ? cleaned.slice(0, -4) : cleaned;
  }

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8080";
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8080";
}

/* ======================================================
   Token Management
====================================================== */
export function setAuthToken(token) {
  if (!IS_BROWSER) return;
  
  const clean = String(token || "").trim();
  if (!clean) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  
  localStorage.setItem(TOKEN_KEY, clean);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  const token = localStorage.getItem(TOKEN_KEY) || "";
  return String(token).trim();
}

export function clearAuthToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getAuthToken();
}

/* ======================================================
   Axios Instance
====================================================== */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ======================================================
   Dev Logging
====================================================== */
try {
  const isDev =
    (IS_BROWSER &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)) ||
    (!IS_BROWSER && process.env.NODE_ENV === "development");

  if (isDev) {
    console.log("[BotAPI] API Origin:", API_ORIGIN);
    console.log("[BotAPI] Base URL:", BASE_URL);
    console.log("[BotAPI] Available Endpoints:");
    console.log("  - POST /signup");
    console.log("  - POST /auth/login");
    console.log("  - POST /auth/wallet");
    console.log("  - GET /me");
    console.log("  - GET /promo/status");
    console.log("  - POST /promo/claim");
    console.log("  - GET /health");
  }
} catch {
  /* noop */
}

/* ======================================================
   Request Interceptor
====================================================== */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
   Response Interceptor
====================================================== */
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url}: ${response.status}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[API Error] ${method?.toUpperCase()} ${url}: ${status}`, error.response?.data);
    }
    
    if (status === 401) {
      clearAuthToken();
      if (IS_BROWSER && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

/* ======================================================
   Error Wrapper
====================================================== */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.message ||
      "API request failed";

    console.error("[BotAPI Error]", {
      status,
      message,
      url: err?.config?.url,
      method: err?.config?.method,
      data: err?.response?.data
    });

    const e = new Error(message);
    e.status = status;
    e.data = err?.response?.data;
    
    throw e;
  }
}

/* ======================================================
   Centralized API Interface - FIXED ENDPOINTS
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,
  isLoggedIn,
  
  /* ---------------- Health & System ---------------- */
  health: () => tryApi(() => api.get("/health")),
  systemInfo: () => tryApi(() => api.get("/system/info")),
  
  /* ---------------- Auth ---------------- */
  // FIXED: Using /signup instead of /auth/signup
  signup: async (payload) => {
    console.log("[BotAPI] Signup to /signup endpoint");
    const data = await tryApi(() => api.post("/signup", payload));
    
    // Check for token in various response formats
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Token saved successfully");
    } else {
      console.warn("[BotAPI] No token in signup response:", data);
    }
    
    return data;
  },
  
  login: async (payload) => {
    console.log("[BotAPI] Login to /auth/login endpoint");
    const data = await tryApi(() => api.post("/auth/login", payload));
    
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Login token saved");
    }
    
    return data;
  },
  
  walletAuth: async (payload) => {
    console.log("[BotAPI] Wallet auth to /auth/wallet endpoint");
    const data = await tryApi(() => api.post("/auth/wallet", payload));
    
    const token = data.token || data.data?.token;
    if (token) setAuthToken(token);
    
    return data;
  },
  
  logout: () => {
    console.log("[BotAPI] Logging out");
    clearAuthToken();
  },
  
  /* ---------------- User ---------------- */
  me: () => {
    console.log("[BotAPI] Getting user profile from /me");
    return tryApi(() => api.get("/me"));
  },
  
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),
  permissions: () => tryApi(() => api.get("/me/permissions")),
  
  /* ---------------- Promo ---------------- */
  promoStatus: () => {
    console.log("[BotAPI] Getting promo status");
    return tryApi(() => api.get("/promo/status"));
  },
  
  promoClaim: (payload) => {
    console.log("[BotAPI] Claiming promo");
    return tryApi(() => api.post("/promo/claim", payload));
  },
  
  promoMe: () => tryApi(() => api.get("/promo/me")),
  
  /* ---------------- Integrations ---------------- */
  connectWallet: (payload) => 
    tryApi(() => api.post("/integrations/wallet", payload)),
  
  connectOkx: (payload) => 
    tryApi(() => api.post("/integrations/okx", payload)),
  
  connectAlpaca: (payload) => 
    tryApi(() => api.post("/integrations/alpaca", payload)),
  
  integrationStatus: () => tryApi(() => api.get("/integrations/status")),
  
  /* ---------------- Trading ---------------- */
  tradingEnable: (enabled) => 
    tryApi(() => api.post("/trading/enable", { enabled: !!enabled })),
  
  tradingStatus: () => tryApi(() => api.get("/trading/status")),
  
  botStart: (payload = {}) => 
    tryApi(() => api.post("/bot/start", payload)),
  
  /* ---------------- Sniper Trades ---------------- */
  sniperTrades: () => tryApi(() => api.get("/sniper/trades")),
  
  /* ---------------- Analytics ---------------- */
  analyticsPnlSeries: (payload) => 
    tryApi(() => api.post("/analytics/pnl/series", payload)),
  
  analyticsWinLoss: (payload) => 
    tryApi(() => api.post("/analytics/winloss", payload)),
  
  analyticsFeesSeries: (payload) => 
    tryApi(() => api.post("/analytics/fees/series", payload)),
  
  /* ---------------- Billing ---------------- */
  billingSetupIntent: (payload = {}) => 
    tryApi(() => api.post("/billing/setup-intent", payload)),
  
  billingCardStatus: (payload = {}) => 
    tryApi(() => api.get("/billing/card-status", { params: payload })),
  
  billingSetDefaultPaymentMethod: (payload) => 
    tryApi(() => api.post("/billing/set-default-payment", payload)),
  
  billingCalculateFee: (payload) => 
    tryApi(() => api.post("/billing/calculate-fee", payload)),
  
  billingChargeFee: (payload) => 
    tryApi(() => api.post("/billing/charge-fee", payload)),
  
  billingFeeHistory: () => tryApi(() => api.get("/billing/fee-history")),
  
  /* ---------------- Admin ---------------- */
  adminCheck: () => tryApi(() => api.get("/admin/check")),
  adminUsers: () => tryApi(() => api.get("/admin/users")),
  adminUpdateUserTier: (payload) => 
    tryApi(() => api.post("/admin/user/update-tier", payload)),
  adminProcessPendingFees: (payload = {}) => 
    tryApi(() => api.post("/admin/process-pending-fees", payload)),
  
  /* ---------------- Token Helpers ---------------- */
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,
  
  /* ---------------- Test Connection ---------------- */
  testConnection: async () => {
    try {
      console.log("[BotAPI] Testing connection to /health");
      const health = await tryApi(() => api.get("/health"));
      console.log("[BotAPI] Health check successful:", health);
      return health;
    } catch (error) {
      console.error("[BotAPI] Health check failed:", error);
      throw error;
    }
  },
  
  /* ---------------- Endpoint Discovery ---------------- */
  listEndpoints: async () => {
    // Try common endpoints to see what's available
    const endpoints = [];
    
    const testEndpoint = async (path, method = 'GET') => {
      try {
        if (method === 'GET') {
          await api.head(path, { timeout: 5000 });
          return true;
        }
        return false;
      } catch (error) {
        return error.response?.status !== 404;
      }
    };
    
    const commonEndpoints = [
      '/health',
      '/signup',
      '/auth/login',
      '/auth/wallet',
      '/me',
      '/promo/status'
    ];
    
    for (const endpoint of commonEndpoints) {
      const available = await testEndpoint(endpoint);
      endpoints.push({ endpoint, available });
    }
    
    return endpoints;
  }
};

export default BotAPI;
