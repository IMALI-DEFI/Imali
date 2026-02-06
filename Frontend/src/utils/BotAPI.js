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
      return "http://localhost:8080"; // Changed from 8001 to 8080 to match backend
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8080"; // Changed from 8001 to 8080
}

/* ======================================================
   Token Management (FIXED - DO NOT STRIP PREFIX)
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
  }
} catch {
  /* noop */
}

/* ======================================================
   Auth Injection (FIXED)
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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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

    console.error("[BotAPI Error]", {
      status,
      message,
      url: err?.config?.url,
      method: err?.config?.method
    });

    const e = new Error(message);
    e.status = status;

    throw e;
  }
}

/* ======================================================
   Centralized API Interface
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,
  
  /* ---------------- Health & System ---------------- */
  health: () => tryApi(() => api.get("/health")),
  systemInfo: () => tryApi(() => api.get("/system/info")),
  
  /* ---------------- Auth ---------------- */
  signup: async (payload) => {
    const data = await tryApi(() => api.post("/signup", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },
  
  login: async (payload) => {
    const data = await tryApi(() => api.post("/auth/login", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },
  
  walletAuth: async (payload) => {
    const data = await tryApi(() => api.post("/auth/wallet", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },
  
  logout: () => {
    clearAuthToken();
  },
  
  /* ---------------- User ---------------- */
  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),
  permissions: () => tryApi(() => api.get("/me/permissions")),
  
  /* ---------------- Promo ---------------- */
  promoStatus: () => tryApi(() => api.get("/promo/status")),
  promoClaim: (payload) => tryApi(() => api.post("/promo/claim", payload)),
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
  
  /* ---------------- Raw Helpers ---------------- */
  rawGet: async (path) => (await api.get(path)).data,
  rawPost: async (path, body = {}) => (await api.post(path, body)).data,
};

export default BotAPI;