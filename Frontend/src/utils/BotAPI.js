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
   API Origin Resolver (single source of truth)
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
  timeout: 20000,
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
    console.log("[BotAPI] Current Token:", getAuthToken() ? "YES (length: " + getAuthToken().length + ")" : "NO");
  }
} catch {
  /* noop */
}

/* ======================================================
   Auth Injection
====================================================== */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
   Response Interceptor - Auto logout on 401
====================================================== */
api.interceptors.response.use(
  (response) => {
    // Log successful responses in dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.status, response.data);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;
    
    console.error(`[API Error] ${method?.toUpperCase()} ${url}:`, status, error.response?.data);
    
    if (status === 401) {
      clearAuthToken();
      // Redirect to login if in browser
      if (IS_BROWSER && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    
    return Promise.reject(error);
  }
);

/* ======================================================
   Unified Error Wrapper
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

    // Create enriched error object
    const e = new Error(message);
    e.status = status;
    e.data = err?.response?.data;
    e.url = err?.config?.url;
    
    throw e;
  }
}

/* ======================================================
   Centralized API Interface
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,
  isLoggedIn,
  
  /* ---------------- Health & System ---------------- */
  health: () => tryApi(() => api.get("/health")),
  systemInfo: () => tryApi(() => api.get("/system/info")),
  
  /* ---------------- Auth ---------------- */
  // FIXED: Signup endpoint is /api/auth/signup, not /api/signup
  signup: async (payload) => {
    console.log("[BotAPI] Signup payload:", payload);
    const data = await tryApi(() => api.post("/auth/signup", payload));
    console.log("[BotAPI] Signup response:", data);
    
    // Handle different response formats
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Token set:", token.substring(0, 30) + "...");
    } else {
      console.warn("[BotAPI] No token in signup response:", data);
    }
    
    return data;
  },
  
  // FIXED: Login endpoint is /api/auth/login
  login: async (payload) => {
    console.log("[BotAPI] Login attempt:", payload.email);
    const data = await tryApi(() => api.post("/auth/login", payload));
    console.log("[BotAPI] Login response:", data);
    
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Token set for login");
    }
    
    return data;
  },
  
  // FIXED: Wallet auth endpoint
  walletAuth: async (payload) => {
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
    console.log("[BotAPI] Getting user profile");
    return tryApi(() => api.get("/me"));
  },
  
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),
  permissions: () => tryApi(() => api.get("/me/permissions")),
  
  /* ---------------- Promo ---------------- */
  promoStatus: () => tryApi(() => api.get("/promo/status")),
  promoClaim: (payload) => {
    console.log("[BotAPI] Claiming promo:", payload.email);
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
  
  /* ---------------- Test Endpoints ---------------- */
  testConnection: () => tryApi(() => api.get("/health")),
};

export default BotAPI;
