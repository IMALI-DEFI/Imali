// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  withCredentials: false
});

/* =========================
   TOKEN HELPERS
========================= */

const safeGet = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const safeSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

const safeRemove = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {
    // ignore
  }
};

const getStoredToken = () => safeGet(TOKEN_KEY);

const setStoredToken = (token) => {
  if (!token || typeof token !== "string") return;
  safeSet(TOKEN_KEY, token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const clearStoredToken = () => {
  safeRemove(TOKEN_KEY);
  delete api.defaults.headers.common["Authorization"];
};

/* =========================
   ROUTE HELPERS
========================= */

const getPath = () => {
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
};

// Pages where a 401 can happen during onboarding
const AUTH_WHITELIST = [
  "/login",
  "/signup",
  "/billing",
  "/activation",
  "/trade-demo",
  "/terms",
  "/privacy",
];

// Request queue to prevent rate limiting
let requestQueue = [];
let isProcessing = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 800;

const processQueue = async () => {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  
  while (requestQueue.length > 0) {
    const { config, resolve, reject } = requestQueue.shift();
    
    try {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
      }
      
      const response = await axios({
        ...config,
        baseURL: API_BASE,
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(config.headers || {})
        }
      });
      
      lastRequestTime = Date.now();
      resolve(response);
    } catch (error) {
      reject(error);
    }
  }
  
  isProcessing = false;
};

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    config.headers = headers;

    return new Promise((resolve, reject) => {
      requestQueue.push({ config, resolve, reject });
      processQueue();
    });
  },
  (err) => Promise.reject(err)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

let redirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const path = getPath();

    if (error.message === 'Network Error' && !error.response) {
      console.error('Network Error - Check if backend is running');
      return Promise.reject(error);
    }

    if (status === 429) {
      console.warn("Rate limited by API");
      return Promise.reject(error);
    }

    if (status === 503) {
      console.error("Service unavailable");
      return Promise.reject(error);
    }

    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/signup") ||
      url.includes("/api/me") ||
      url.includes("/api/me/activation-status");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();

      const isWhitelisted = AUTH_WHITELIST.some((p) => path.startsWith(p));
      if (!isWhitelisted && !redirecting) {
        redirecting = true;
        const next = encodeURIComponent(path);
        window.location.href = `/login?next=${next}`;
        
        setTimeout(() => {
          redirecting = false;
        }, 5000);
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   API METHODS - SAFE UNWRAPPING
========================= */

const unwrap = (res) => {
  // Safely unwrap response data
  if (!res) return null;
  return res.data || res;
};

const getErrMessage = (err, fallback = "Request failed") => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  return msg || fallback;
};

const BotAPI = {
  /* ========= TOKEN ========= */

  setToken(token) {
    setStoredToken(token);
  },

  getToken() {
    return getStoredToken();
  },

  clearToken() {
    clearStoredToken();
  },

  isLoggedIn() {
    return !!getStoredToken();
  },

  /* ========= AUTH ========= */

  async signup(payload) {
    try {
      const res = await api.post("/api/signup", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Signup API error:', error);
      throw error;
    }
  },

  async login(payload) {
    clearStoredToken();

    try {
      const res = await api.post("/api/auth/login", payload);
      const data = unwrap(res);

      if (!data?.token) {
        throw new Error("Login failed: no token returned");
      }

      setStoredToken(data.token);

      setTimeout(async () => {
        try {
          await api.get("/api/me");
        } catch {
          // ignore
        }
      }, 1000);

      return data;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  async me() {
    try {
      const res = await api.get("/api/me");
      const data = unwrap(res);
      // Handle both { user: {...} } and direct user object
      return data?.user || data || null;
    } catch (error) {
      console.error('Me API error:', error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      const res = await api.get("/api/me/activation-status");
      const data = unwrap(res);
      // Handle both { status: {...} } and direct status object
      return data?.status || data || null;
    } catch (error) {
      console.error('Activation status API error:', error);
      throw error;
    }
  },

  /* ========= BILLING ========= */

  async createSetupIntent(payload) {
    const res = await api.post("/api/billing/setup-intent", payload);
    return unwrap(res);
  },

  async getCardStatus() {
    const res = await api.get("/api/billing/card-status");
    return unwrap(res);
  },

  async setDefaultPaymentMethod(payload) {
    const res = await api.post("/api/billing/set-default-payment", payload);
    return unwrap(res);
  },

  async calculateFee(payload) {
    const res = await api.post("/api/billing/calculate-fee", payload);
    return unwrap(res);
  },

  async chargeFee(payload) {
    const res = await api.post("/api/billing/charge-fee", payload);
    return unwrap(res);
  },

  async getFeeHistory() {
    const res = await api.get("/api/billing/fee-history");
    return unwrap(res);
  },

  /* ========= INTEGRATIONS ========= */

  async connectOKX(payload) {
    const res = await api.post("/api/integrations/okx", payload);
    return unwrap(res);
  },

  async connectAlpaca(payload) {
    const res = await api.post("/api/integrations/alpaca", payload);
    return unwrap(res);
  },

  async connectWallet(payload) {
    const res = await api.post("/api/integrations/wallet", payload);
    return unwrap(res);
  },

  async getIntegrationStatus() {
    const res = await api.get("/api/integrations/status");
    return unwrap(res);
  },

  /* ========= TRADING ========= */

  async toggleTrading(enabled) {
    const res = await api.post("/api/trading/enable", { enabled });
    return unwrap(res);
  },

  async getTradingStatus() {
    const res = await api.get("/api/trading/status");
    return unwrap(res);
  },

  /* ========= BOT CONTROL ========= */

  async startBot(payload = { mode: "paper" }) {
    const res = await api.post("/api/bot/start", payload);
    return unwrap(res);
  },

  /* ========= TRADES ========= */

  async getTrades() {
    const res = await api.get("/api/sniper/trades");
    return unwrap(res);
  },

  /* ========= ANALYTICS ========= */

  async getPnLSeries(payload) {
    const res = await api.post("/api/analytics/pnl/series", payload);
    return unwrap(res);
  },

  async getWinLossStats(payload) {
    const res = await api.post("/api/analytics/winloss", payload);
    return unwrap(res);
  },

  async getFeeSeries(payload) {
    const res = await api.post("/api/analytics/fees/series", payload);
    return unwrap(res);
  },

  /* ========= PROMO ========= */

  async getPromoStatus() {
    const res = await api.get("/api/promo/status");
    return unwrap(res);
  },

  async claimPromo(payload) {
    const res = await api.post("/api/promo/claim", payload);
    return unwrap(res);
  },

  async getMyPromoStatus() {
    const res = await api.get("/api/promo/me");
    return unwrap(res);
  },

  /* ========= ADMIN ========= */

  async adminCheck() {
    const res = await api.get("/api/admin/check");
    return unwrap(res);
  },

  async adminGetUsers() {
    const res = await api.get("/api/admin/users");
    return unwrap(res);
  },

  async adminUpdateUserTier(payload) {
    const res = await api.post("/api/admin/user/update-tier", payload);
    return unwrap(res);
  },

  async adminProcessPendingFees(payload) {
    const res = await api.post("/api/admin/process-pending-fees", payload);
    return unwrap(res);
  },

  /* ========= SYSTEM ========= */

  async healthCheck() {
    const res = await api.get("/api/health");
    return unwrap(res);
  },

  /* ========= UTIL ========= */

  errMessage(err, fallback) {
    return getErrMessage(err, fallback);
  },
};

export { api };
export default BotAPI;
