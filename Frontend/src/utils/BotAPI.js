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
    console.log("[BotAPI] Current Token:", getAuthToken() ? "YES" : "NO");
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
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
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
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}: ${response.status}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method;
    const data = error.response?.data;
    
    console.error(`[API Error] ${method?.toUpperCase()} ${url}: ${status}`, data);
    
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
   Error Wrapper with Better Error Messages
====================================================== */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    
    // Build user-friendly error message
    let message = "Request failed";
    
    if (data?.message) {
      message = data.message;
    } else if (data?.error) {
      message = data.error;
    } else if (data?.detail) {
      message = data.detail;
    } else if (err?.message) {
      message = err.message;
    }
    
    // Add status-specific messages
    if (status === 404) {
      message = `Endpoint not found: ${err.config?.url}`;
    } else if (status === 500) {
      message = "Server error. Please try again later.";
    } else if (status === 400) {
      if (message.includes("email")) {
        message = "Invalid email address";
      } else if (message.includes("password")) {
        message = "Invalid password";
      }
    } else if (status === 409) {
      message = "Account already exists";
    }
    
    console.error("[BotAPI Error]", {
      status,
      message,
      url: err?.config?.url,
      method: err?.config?.method,
      data: data
    });

    const e = new Error(message);
    e.status = status;
    e.data = data;
    e.url = err?.config?.url;
    
    throw e;
  }
}

/* ======================================================
   Centralized API Interface - CORRECTED ENDPOINTS
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,
  isLoggedIn,
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,
  
  /* ---------------- Health & System ---------------- */
  health: () => tryApi(() => api.get("/health")),
  systemInfo: () => tryApi(() => api.get("/system/info")),
  
  /* ---------------- Authentication ---------------- */
  signup: async (payload) => {
    console.log("[BotAPI] Signup request:", { email: payload.email, tier: payload.tier });
    const data = await tryApi(() => api.post("/auth/signup", payload));
    
    // Handle token in response
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Token saved");
    } else {
      console.warn("[BotAPI] No token in signup response");
    }
    
    return data;
  },
  
  login: async (payload) => {
    console.log("[BotAPI] Login request:", { email: payload.email });
    const data = await tryApi(() => api.post("/auth/login", payload));
    
    const token = data.token || data.data?.token;
    if (token) {
      setAuthToken(token);
      console.log("[BotAPI] Login token saved");
    }
    
    return data;
  },
  
  walletAuth: async (payload) => {
    console.log("[BotAPI] Wallet auth request:", { wallet: payload.wallet });
    const data = await tryApi(() => api.post("/auth/wallet", payload));
    
    const token = data.token || data.data?.token;
    if (token) setAuthToken(token);
    
    return data;
  },
  
  logout: () => {
    console.log("[BotAPI] Logging out");
    clearAuthToken();
  },
  
  /* ---------------- User Profile ---------------- */
  me: () => {
    console.log("[BotAPI] Getting user profile");
    return tryApi(() => api.get("/me"));
  },
  
  activationStatus: () => {
    console.log("[BotAPI] Getting activation status");
    return tryApi(() => api.get("/me/activation-status"));
  },
  
  permissions: () => tryApi(() => api.get("/me/permissions")),
  
  /* ---------------- Promo System ---------------- */
  promoStatus: () => {
    console.log("[BotAPI] Getting promo status");
    return tryApi(() => api.get("/promo/status"));
  },
  
  promoClaim: (payload) => {
    console.log("[BotAPI] Claiming promo:", { email: payload.email });
    return tryApi(() => api.post("/promo/claim", payload));
  },
  
  promoMe: () => tryApi(() => api.get("/promo/me")),
  
  /* ---------------- Integrations ---------------- */
  connectWallet: (payload) => {
    console.log("[BotAPI] Connecting wallet:", { wallet: payload.wallet });
    return tryApi(() => api.post("/integrations/wallet", payload));
  },
  
  connectOkx: (payload) => {
    console.log("[BotAPI] Connecting OKX");
    return tryApi(() => api.post("/integrations/okx", payload));
  },
  
  connectAlpaca: (payload) => {
    console.log("[BotAPI] Connecting Alpaca");
    return tryApi(() => api.post("/integrations/alpaca", payload));
  },
  
  integrationStatus: () => tryApi(() => api.get("/integrations/status")),
  
  /* ---------------- Trading Control ---------------- */
  tradingEnable: (enabled) => {
    console.log(`[BotAPI] ${enabled ? "Enabling" : "Disabling"} trading`);
    return tryApi(() => api.post("/trading/enable", { enabled: !!enabled }));
  },
  
  tradingStatus: () => tryApi(() => api.get("/trading/status")),
  
  /* ---------------- Bot Control ---------------- */
  botStart: (payload = {}) => {
    console.log("[BotAPI] Starting bot:", payload);
    return tryApi(() => api.post("/bot/start", payload));
  },
  
  /* ---------------- Trade History ---------------- */
  sniperTrades: () => tryApi(() => api.get("/sniper/trades")),
  
  /* ---------------- Analytics ---------------- */
  analyticsPnlSeries: (payload) => 
    tryApi(() => api.post("/analytics/pnl/series", payload)),
  
  analyticsWinLoss: (payload) => 
    tryApi(() => api.post("/analytics/winloss", payload)),
  
  analyticsFeesSeries: (payload) => 
    tryApi(() => api.post("/analytics/fees/series", payload)),
  
  /* ---------------- Billing & Payments ---------------- */
  billingSetupIntent: (payload = {}) => {
    console.log("[BotAPI] Creating setup intent");
    return tryApi(() => api.post("/billing/setup-intent", payload));
  },
  
  billingCardStatus: (payload = {}) => {
    console.log("[BotAPI] Getting card status");
    return tryApi(() => api.get("/billing/card-status", { params: payload }));
  },
  
  billingSetDefaultPaymentMethod: (payload) => {
    console.log("[BotAPI] Setting default payment method");
    return tryApi(() => api.post("/billing/set-default-payment", payload));
  },
  
  billingCalculateFee: (payload) => 
    tryApi(() => api.post("/billing/calculate-fee", payload)),
  
  billingChargeFee: (payload) => 
    tryApi(() => api.post("/billing/charge-fee", payload)),
  
  billingFeeHistory: () => tryApi(() => api.get("/billing/fee-history")),
  
  /* ---------------- Admin Endpoints ---------------- */
  adminCheck: () => tryApi(() => api.get("/admin/check")),
  
  adminUsers: () => {
    console.log("[BotAPI] Getting all users (admin)");
    return tryApi(() => api.get("/admin/users"));
  },
  
  adminUpdateUserTier: (payload) => {
    console.log("[BotAPI] Updating user tier:", payload);
    return tryApi(() => api.post("/admin/user/update-tier", payload));
  },
  
  adminProcessPendingFees: (payload = {}) => {
    console.log("[BotAPI] Processing pending fees");
    return tryApi(() => api.post("/admin/process-pending-fees", payload));
  },
  
  /* ---------------- Test & Debug ---------------- */
  testConnection: async () => {
    try {
      console.log("[BotAPI] Testing connection...");
      const result = await tryApi(() => api.get("/health"));
      console.log("[BotAPI] Connection test successful:", result);
      return result;
    } catch (error) {
      console.error("[BotAPI] Connection test failed:", error);
      throw error;
    }
  },
  
  /* ---------------- Webhook Testing ---------------- */
  // Note: These would be used by the bot service, not the frontend
  // Included for completeness
  submitBotWebhook: async (payload, signature) => {
    const headers = signature ? { "X-Bot-Signature": signature } : {};
    return tryApi(() => api.post("/bot/webhook", payload, { headers }));
  },
  
  submitStripeWebhook: async (payload, signature) => {
    const headers = signature ? { "Stripe-Signature": signature } : {};
    return tryApi(() => api.post("/stripe/webhook", payload, { headers }));
  }
};

export default BotAPI;
