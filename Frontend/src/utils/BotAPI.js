// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

/* =========================
   AXIOS INSTANCE WITH SAFE HEADER HANDLING
========================= */

// Create axios instance with safe defaults
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  withCredentials: false,
  // Transform response to handle potential undefined values
  transformResponse: [(data) => {
    try {
      return data ? JSON.parse(data) : {};
    } catch {
      return data || {};
    }
  }]
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
      
      // Ensure all headers are strings
      const safeHeaders = {};
      if (config.headers) {
        Object.keys(config.headers).forEach(key => {
          const value = config.headers[key];
          if (value !== undefined && value !== null) {
            safeHeaders[key] = String(value);
          }
        });
      }
      
      const response = await axios({
        ...config,
        baseURL: API_BASE,
        timeout: 30000,
        headers: safeHeaders
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

    // Start with base headers
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    // Add Authorization if token exists (ensure it's a string)
    if (token && typeof token === 'string') {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Replace config headers with safe headers (all values are strings)
    config.headers = headers;

    // Log for debugging (remove in production)
    console.log('Request config:', {
      url: config.url,
      method: config.method,
      headers: config.headers
    });

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
  (response) => {
    // Log successful response (remove in production)
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      hasData: !!response.data
    });
    return response;
  },
  (error) => {
    console.error('Response error:', {
      url: error?.config?.url,
      status: error?.response?.status,
      message: error.message
    });

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
  
  // Handle different response structures
  if (res.data && typeof res.data === 'object') {
    return res.data;
  }
  
  return res.data || res || null;
};

const getErrMessage = (err, fallback = "Request failed") => {
  try {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message;
  
    return msg || fallback;
  } catch {
    return fallback;
  }
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

      // Warm auth with delay
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
      
      // Handle different response structures
      if (!data) return null;
      
      // Check for user object in response
      if (data.user && typeof data.user === 'object') {
        return data.user;
      }
      
      // Otherwise return the data itself if it looks like a user
      if (data.id || data.email) {
        return data;
      }
      
      return null;
    } catch (error) {
      console.error('Me API error:', error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      const res = await api.get("/api/me/activation-status");
      const data = unwrap(res);
      
      // Handle different response structures
      if (!data) return null;
      
      // Check for status object in response
      if (data.status && typeof data.status === 'object') {
        return data.status;
      }
      
      // If data has activation-related fields, return it directly
      if (data.billing_complete !== undefined || data.activation_complete !== undefined) {
        return data;
      }
      
      return data || null;
    } catch (error) {
      console.error('Activation status API error:', error);
      throw error;
    }
  },

  /* ========= BILLING ========= */

  async createSetupIntent(payload) {
    try {
      const res = await api.post("/api/billing/setup-intent", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Create setup intent error:', error);
      throw error;
    }
  },

  async getCardStatus() {
    try {
      const res = await api.get("/api/billing/card-status");
      return unwrap(res);
    } catch (error) {
      console.error('Get card status error:', error);
      throw error;
    }
  },

  /* ========= INTEGRATIONS ========= */

  async connectOKX(payload) {
    try {
      const res = await api.post("/api/integrations/okx", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Connect OKX error:', error);
      throw error;
    }
  },

  async connectAlpaca(payload) {
    try {
      const res = await api.post("/api/integrations/alpaca", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Connect Alpaca error:', error);
      throw error;
    }
  },

  async connectWallet(payload) {
    try {
      const res = await api.post("/api/integrations/wallet", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Connect wallet error:', error);
      throw error;
    }
  },

  /* ========= TRADING ========= */

  async toggleTrading(enabled) {
    try {
      const res = await api.post("/api/trading/enable", { enabled });
      return unwrap(res);
    } catch (error) {
      console.error('Toggle trading error:', error);
      throw error;
    }
  },

  /* ========= BOT CONTROL ========= */

  async startBot(payload = { mode: "paper" }) {
    try {
      const res = await api.post("/api/bot/start", payload);
      return unwrap(res);
    } catch (error) {
      console.error('Start bot error:', error);
      throw error;
    }
  },

  /* ========= TRADES ========= */

  async getTrades() {
    try {
      const res = await api.get("/api/sniper/trades");
      return unwrap(res);
    } catch (error) {
      console.error('Get trades error:', error);
      throw error;
    }
  },

  /* ========= UTIL ========= */

  errMessage(err, fallback) {
    return getErrMessage(err, fallback);
  },
};

export { api };
export default BotAPI;
