// src/utils/BotAPI.js
import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */
const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* =====================================================
   TOKEN HELPERS
===================================================== */
export const getToken = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    // Check if token exists and is not expired (basic check)
    if (!token) return null;
    
    // For JWT tokens, check if they start with jwt: or wallet:
    if (token.startsWith("jwt:") || token.startsWith("wallet:") || token.startsWith("google:")) {
      return token;
    }
    
    // If it's a raw JWT, wrap it
    if (token.includes(".") && token.split(".").length === 3) {
      return `jwt:${token}`;
    }
    
    return token;
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!token || typeof token !== "string") return;
  
  // Ensure token is properly formatted
  let formattedToken = token;
  if (!token.startsWith("jwt:") && !token.startsWith("wallet:") && !token.startsWith("google:")) {
    if (token.includes(".") && token.split(".").length === 3) {
      formattedToken = `jwt:${token}`;
    }
  }
  
  localStorage.setItem(TOKEN_KEY, formattedToken);
};

export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const isLoggedIn = () => {
  const token = getToken();
  if (!token) return false;
  
  // Simple check - in production, you should decode and check expiry
  return true;
};

/* =====================================================
   AXIOS INSTANCE
===================================================== */
const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/* =====================================================
   REQUEST INTERCEPTOR - Add Auth Header
===================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =====================================================
   RESPONSE INTERCEPTOR - Handle Auth Errors
===================================================== */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login on 401
      clearToken();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

/* =====================================================
   RESPONSE NORMALIZER
===================================================== */
const unwrap = async (fn) => {
  try {
    const response = await fn();
    return response.data;
  } catch (err) {
    const error = new Error(
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      "Request failed"
    );
    error.status = err?.response?.status;
    error.data = err?.response?.data;
    
    // Log for debugging
    console.error("API Error:", {
      status: error.status,
      message: error.message,
      data: error.data
    });
    
    throw error;
  }
};

/* =====================================================
   BOT API (AUTH + APP)
===================================================== */
const BotAPI = {
  /* ---------- Health Check ---------- */
  health: () => unwrap(() => api.get("/health")),

  /* ---------- Signup ---------- */
  signup: async (payload) => {
    const data = await unwrap(() => api.post("/signup", payload));
    
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  /* ---------- Login ---------- */
  login: async (payload) => {
    const data = await unwrap(() => api.post("/auth/login", payload));
    
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  /* ---------- Wallet Auth ---------- */
  walletAuth: async (payload) => {
    const data = await unwrap(() => api.post("/auth/wallet", payload));
    
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  /* ---------- Logout ---------- */
  logout: () => {
    clearToken();
    window.location.href = "/login";
  },

  /* ---------- User ---------- */
  me: () => unwrap(() => api.get("/me")),

  activationStatus: () => unwrap(() => api.get("/me/activation-status")),

  permissions: () => unwrap(() => api.get("/me/permissions")),

  /* ---------- Promo ---------- */
  promoStatus: () => unwrap(() => api.get("/promo/status")),
  
  claimPromo: (payload) => unwrap(() => api.post("/promo/claim", payload)),
  
  myPromoStatus: () => unwrap(() => api.get("/promo/me")),

  /* ---------- Billing ---------- */
  billingSetupIntent: (payload) => unwrap(() => api.post("/billing/setup-intent", payload)),
  
  cardStatus: (payload) => unwrap(() => api.get("/billing/card-status", { params: payload })),

  calculateFee: (payload) => unwrap(() => api.post("/billing/calculate-fee", payload)),

  feeHistory: () => unwrap(() => api.get("/billing/fee-history")),

  /* ---------- Trading ---------- */
  tradingEnable: (enabled) => unwrap(() => api.post("/trading/enable", { enabled: !!enabled })),

  tradingStatus: () => unwrap(() => api.get("/trading/status")),

  botStart: (payload = {}) => unwrap(() => api.post("/bot/start", payload)),

  sniperTrades: () => unwrap(() => api.get("/sniper/trades")),

  /* ---------- Integrations ---------- */
  connectWallet: (payload) => unwrap(() => api.post("/integrations/wallet", payload)),
  
  connectOKX: (payload) => unwrap(() => api.post("/integrations/okx", payload)),
  
  connectAlpaca: (payload) => unwrap(() => api.post("/integrations/alpaca", payload)),
  
  integrationStatus: () => unwrap(() => api.get("/integrations/status")),

  /* ---------- Analytics ---------- */
  pnlSeries: (payload) => unwrap(() => api.post("/analytics/pnl/series", payload)),
  
  winLossStats: (payload) => unwrap(() => api.post("/analytics/winloss", payload)),
  
  feeSeries: (payload) => unwrap(() => api.post("/analytics/fees/series", payload)),

  /* ---------- Token helpers ---------- */
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
