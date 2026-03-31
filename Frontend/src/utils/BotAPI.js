// src/utils/BotAPI.js
import axios from "axios";

// =========================
// CONFIGURATION
// =========================
const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || 
  "https://api.imali-defi.com";

const TOKEN_KEY = "imali_token";

// =========================
// RETRY CONFIGURATION
// =========================
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Helper function to check if we're on a billing-related page
const isStripePage = () => {
  const path = window.location.pathname;
  return path.includes('/billing') || 
         path.includes('/activation') ||
         path.includes('/signup') ||
         path.includes('/checkout') ||
         path.includes('/billing-dashboard');
};

// Helper function for retry logic
const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (error.response?.status === 401) {
        throw error; // Don't retry auth errors
      }
      if (error.response?.status === 429) {
        const delay = RETRY_DELAY * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
  throw lastError;
};

// =========================
// AXIOS INSTANCE
// =========================
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// =========================
// TOKEN MANAGEMENT
// =========================
const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  console.log("[BotAPI] setStoredToken called with token length:", token?.length);
  if (!token || typeof token !== "string") {
    console.log("[BotAPI] Invalid token, not saving");
    return false;
  }
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log("[BotAPI] Token saved to localStorage. Length:", token.length);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return true;
  } catch (e) {
    console.error("[BotAPI] Failed to save token:", e);
    return false;
  }
};

const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log("[BotAPI] Token cleared from localStorage");
  } catch {}
  delete api.defaults.headers.common["Authorization"];
};

// =========================
// REQUEST INTERCEPTORS
// =========================
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR WITH RETRY LOGIC
// =========================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    
    console.error(`[API Error] ${status} - ${url}:`, error?.response?.data || error.message);
    
    // Clear token on 401
    if (status === 401) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    
    return Promise.reject(error);
  }
);

// =========================
// API CLIENT
// =========================
const BotAPI = {
  // Token management
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => {
    const hasToken = !!getStoredToken();
    console.log("[BotAPI] isLoggedIn check:", hasToken);
    return hasToken;
  },
  clearCache: () => {},

  // ========================
  // AUTHENTICATION
  // ========================
  async signup(userData) {
    return withRetry(async () => {
      console.log("[BotAPI] Signup request for:", userData.email);
      const response = await api.post("/api/signup", userData);
      console.log("[BotAPI] Signup response:", response.data);
      
      const data = response.data;
      const token = data?.data?.token || data?.token;
      if (token) {
        console.log("[BotAPI] Token found in signup response");
        this.setToken(token);
      }
      
      return { 
        success: true, 
        data: data.data || data,
        token: token 
      };
    });
  },

  async login(credentials) {
    return withRetry(async () => {
      console.log("[BotAPI] Login request for:", credentials.email);
      const response = await api.post("/api/auth/login", credentials);
      console.log("[BotAPI] Login response status:", response.status);
      console.log("[BotAPI] Login response data:", response.data);
      
      const data = response.data;
      
      if (data?.data?.twofa_required) {
        console.log("[BotAPI] 2FA required");
        return { 
          success: true, 
          twofaRequired: true, 
          tempToken: data.data.temp_token 
        };
      }
      
      const token = data?.data?.token || data?.token;
      
      if (token) {
        console.log("[BotAPI] Token found, saving...");
        const saved = this.setToken(token);
        console.log("[BotAPI] Token saved successfully:", saved);
        const verifyToken = this.getToken();
        console.log("[BotAPI] Verification - token in localStorage:", !!verifyToken);
      } else {
        console.log("[BotAPI] No token found in response");
        console.log("[BotAPI] Response structure:", Object.keys(data));
      }
      
      return { 
        success: true, 
        data: data.data || data,
        token: token 
      };
    });
  },

  async me() {
    return withRetry(async () => {
      console.log("[BotAPI] Fetching user profile...");
      const response = await api.get("/api/me");
      console.log("[BotAPI] Profile response:", response.data);
      return response.data;
    });
  },

  async activationStatus() {
    return withRetry(async () => {
      console.log("[BotAPI] Fetching activation status...");
      const response = await api.get("/api/me/activation-status");
      console.log("[BotAPI] Activation status response:", response.data);
      return response.data;
    });
  },

  // ========================
  // BILLING (WITH STRIPE GUARDS)
  // ========================
  async createSetupIntent(payload = {}) {
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping createSetupIntent - not on billing page");
      return { should_skip: true, message: "Not on billing page" };
    }
    
    return withRetry(async () => {
      console.log("[BotAPI] Creating setup intent...");
      const response = await api.post("/api/billing/setup-intent", payload);
      console.log("[BotAPI] Setup intent response:", response.data);
      return response.data;
    });
  },

  async getCardStatus() {
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping getCardStatus - not on billing page");
      return { has_card: false, should_skip: true };
    }
    
    return withRetry(async () => {
      console.log("[BotAPI] Fetching card status...");
      const response = await api.get("/api/billing/card-status");
      console.log("[BotAPI] Card status response:", response.data);
      return response.data;
    });
  },

  async confirmCard() {
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping confirmCard - not on billing page");
      return { should_skip: true };
    }
    
    return withRetry(async () => {
      console.log("[BotAPI] Confirming card...");
      const response = await api.post("/api/billing/confirm-card");
      console.log("[BotAPI] Confirm card response:", response.data);
      return response.data;
    });
  },

  // ========================
  // PROMO CODES
  // ========================
  async getPromoStatus() {
    return withRetry(async () => {
      console.log("[BotAPI] Fetching promo status...");
      const response = await api.get("/api/promo/status");
      return response.data;
    });
  },

  async claimPromo(payload) {
    return withRetry(async () => {
      console.log("[BotAPI] Claiming promo for:", payload.email);
      const response = await api.post("/api/promo/claim", payload);
      return response.data;
    });
  },

  async getMyPromoStatus() {
    return withRetry(async () => {
      console.log("[BotAPI] Fetching my promo status...");
      const response = await api.get("/api/promo/me");
      return response.data;
    });
  },

  async applyPromoCode(code) {
    return withRetry(async () => {
      console.log("[BotAPI] Applying promo code:", code);
      const response = await api.post("/api/promo/apply", { code });
      return response.data;
    });
  },

  // ========================
  // ADMIN ENDPOINTS
  // ========================
  async adminCheck() {
    return withRetry(async () => {
      const response = await api.get("/api/admin/check");
      return response.data;
    });
  },

  async adminGetUsers() {
    return withRetry(async () => {
      const response = await api.get("/api/admin/users");
      return response.data;
    });
  },

  // ========================
  // HEALTH & STATUS
  // ========================
  async healthCheck() {
    return withRetry(async () => {
      const response = await api.get("/api/health");
      return response.data;
    });
  },

  // ========================
  // BOT WEBHOOK
  // ========================
  async triggerBotWebhook(data) {
    return withRetry(async () => {
      const response = await api.post("/api/bot/webhook", data);
      return response.data;
    });
  },

  // All other endpoints follow the same pattern with withRetry wrapper
  // ... (other endpoints remain the same but wrapped with withRetry)
};

// Helper to wrap remaining endpoints
const wrapWithRetry = (fn) => (...args) => withRetry(() => fn(...args));

// Apply retry wrapper to all async methods
Object.keys(BotAPI).forEach(key => {
  if (typeof BotAPI[key] === 'function' && 
      key !== 'setToken' && 
      key !== 'getToken' && 
      key !== 'clearToken' && 
      key !== 'isLoggedIn' && 
      key !== 'clearCache') {
    const original = BotAPI[key];
    BotAPI[key] = wrapWithRetry(original);
  }
});

export default BotAPI;
