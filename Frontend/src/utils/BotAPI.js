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
    try {
      console.log("[BotAPI] Signup request for:", userData.email);
      const response = await api.post("/api/signup", userData);
      console.log("[BotAPI] Signup response:", response.data);
      
      const data = response.data;
      
      // Handle different response structures
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
    } catch (error) {
      console.error("[BotAPI] Signup error:", error.response?.data || error.message);
      throw error;
    }
  },

  async login(credentials) {
    try {
      console.log("[BotAPI] Login request for:", credentials.email);
      const response = await api.post("/api/auth/login", credentials);
      console.log("[BotAPI] Login response status:", response.status);
      console.log("[BotAPI] Login response data:", response.data);
      
      const data = response.data;
      
      // Check if 2FA required
      if (data?.data?.twofa_required) {
        console.log("[BotAPI] 2FA required");
        return { 
          success: true, 
          twofaRequired: true, 
          tempToken: data.data.temp_token 
        };
      }
      
      // Extract token from various possible locations
      const token = data?.data?.token || data?.token;
      
      if (token) {
        console.log("[BotAPI] Token found, saving...");
        const saved = this.setToken(token);
        console.log("[BotAPI] Token saved successfully:", saved);
        
        // Verify token was saved
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
    } catch (error) {
      console.error("[BotAPI] Login error:", error.response?.data || error.message);
      throw error;
    }
  },

  async verify2FA(token, tempToken) {
    try {
      console.log("[BotAPI] Verifying 2FA...");
      const response = await api.post("/api/auth/2fa/verify-login", {
        token,
        temp_token: tempToken,
      });
      console.log("[BotAPI] 2FA verification response:", response.data);
      
      const data = response.data;
      const authToken = data?.data?.token || data?.token;
      
      if (authToken) {
        this.setToken(authToken);
      }
      
      return { success: true, data: data.data || data };
    } catch (error) {
      console.error("[BotAPI] 2FA verification error:", error);
      throw error;
    }
  },

  async me() {
    try {
      console.log("[BotAPI] Fetching user profile...");
      const response = await api.get("/api/me");
      console.log("[BotAPI] Profile response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Profile fetch error:", error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      console.log("[BotAPI] Fetching activation status...");
      const response = await api.get("/api/me/activation-status");
      console.log("[BotAPI] Activation status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Activation status error:", error);
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

  // ========================
  // PASSWORD MANAGEMENT
  // ========================
  async forgotPassword(email) {
    try {
      const response = await api.post("/api/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const response = await api.post("/api/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default BotAPI;
