// src/utils/BotAPI.js
import axios from "axios";

// =========================
// CONFIGURATION
// =========================
const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || 
  "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

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
  if (!token || typeof token !== "string") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } catch {}
};

const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
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
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    
    console.error(`[API Error] ${status} - ${url}:`, error?.response?.data || error.message);
    
    // Clear token on 401
    if (status === 401) {
      clearStoredToken();
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
  isLoggedIn: () => !!getStoredToken(),
  clearCache: () => {},

  // ========================
  // AUTHENTICATION
  // ========================
  async signup(userData) {
    try {
      const response = await api.post("/api/signup", userData);
      const data = response.data;
      
      if (data?.data?.token) {
        this.setToken(data.data.token);
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await api.post("/api/auth/login", credentials);
      const data = response.data;
      
      // Check if 2FA required
      if (data?.data?.twofa_required) {
        return { 
          success: true, 
          twofaRequired: true, 
          tempToken: data.data.temp_token 
        };
      }
      
      if (data?.data?.token) {
        this.setToken(data.data.token);
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      throw error;
    }
  },

  async verify2FA(token, tempToken) {
    try {
      const response = await api.post("/api/auth/2fa/verify-login", {
        token,
        temp_token: tempToken,
      });
      const data = response.data;
      
      if (data?.data?.token) {
        this.setToken(data.data.token);
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      throw error;
    }
  },

  async me() {
    try {
      const response = await api.get("/api/me");
      // Returns { success: true, user: {...} }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async activationStatus() {
    try {
      const response = await api.get("/api/me/activation-status");
      // Returns { success: true, status: {...} }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ========================
  // INTEGRATIONS
  // ========================
  async connectOKX(payload) {
    try {
      const response = await api.post("/api/integrations/okx", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async connectAlpaca(payload) {
    try {
      const response = await api.post("/api/integrations/alpaca", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async connectWallet(payload) {
    try {
      const response = await api.post("/api/integrations/wallet", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getIntegrationStatus() {
    try {
      const response = await api.get("/api/integrations/status");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ========================
  // TRADING
  // ========================
  async toggleTrading(enabled) {
    try {
      const response = await api.post("/api/trading/enable", { enabled });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getTradingStatus() {
    try {
      const response = await api.get("/api/trading/status");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ========================
  // BILLING
  // ========================
  async createSetupIntent() {
    try {
      const response = await api.post("/api/billing/setup-intent");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getCardStatus() {
    try {
      const response = await api.get("/api/billing/card-status");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async confirmCard() {
    try {
      const response = await api.post("/api/billing/confirm-card");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ========================
  // PUBLIC ENDPOINTS
  // ========================
  async getPromoStatus() {
    try {
      const response = await api.get("/api/promo/status");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async claimPromo(payload) {
    try {
      const response = await api.post("/api/promo/claim", payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getLiveStats() {
    try {
      const response = await api.get("/api/public/live-stats");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getAnalyticsSummary() {
    try {
      const response = await api.get("/api/analytics/summary");
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default BotAPI;
