import axios from "axios";

// =========================
// CONFIGURATION
// =========================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const BOT_BASE = process.env.REACT_APP_BOT_BASE_URL || "http://129.213.90.84:8011";
const TOKEN_KEY = "imali_token";

// =========================
// AXIOS INSTANCES
// =========================

// Main API (authentication, billing, user management) - port 8001
const mainApi = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Bot API (trading, stats, bot control) - port 8011
const botApi = axios.create({
  baseURL: BOT_BASE,
  timeout: 15000,
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
    // Set token on both API instances
    mainApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    botApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } catch {}
};

const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  delete mainApi.defaults.headers.common["Authorization"];
  delete botApi.defaults.headers.common["Authorization"];
};

// =========================
// REQUEST INTERCEPTORS
// =========================

// Attach token to all requests if available
const attachToken = (config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

mainApi.interceptors.request.use(attachToken);
botApi.interceptors.request.use(attachToken);

// =========================
// RESPONSE INTERCEPTORS
// =========================

// Main API interceptor - handles auth errors
mainApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    
    console.error(`[MainAPI Error] ${status} - ${url}:`, error?.response?.data || error.message);
    
    // Don't redirect on auth endpoints even if 401
    const isAuthEndpoint = url.includes("/api/auth/login") || url.includes("/api/signup");
    
    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();
      // Optional: redirect to login
      // window.location.href = "/login";
    }
    
    return Promise.reject(error);
  }
);

// Bot API interceptor - just log errors, never redirect
botApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    console.error(`[BotAPI Error] ${status} - ${url}:`, error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

// =========================
// HELPER FUNCTIONS
// =========================

const unwrap = (response) => {
  if (!response) return null;
  // Handle both { success: true, data: ... } and direct data responses
  const data = response.data;
  if (data && typeof data === 'object') {
    // If response has success flag and data property
    if ('success' in data && 'data' in data) {
      return data.data || data;
    }
  }
  return data;
};

const getErrorMessage = (error, fallback = "Request failed") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

// =========================
// API CLIENT
// =========================

const ApiClient = {
  // Token management
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => !!getStoredToken(),

  // ========================
  // AUTHENTICATION (Main API)
  // ========================
  async signup(email, password, tier = "starter") {
    try {
      const response = await mainApi.post("/api/signup", {
        email,
        password,
        tier,
      });
      const data = unwrap(response);
      if (data?.token) {
        setStoredToken(data.token);
      }
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Signup failed"),
        status: error?.response?.status
      };
    }
  },

  async login(email, password) {
    try {
      const response = await mainApi.post("/api/auth/login", {
        email,
        password,
      });
      const data = unwrap(response);
      
      // Check if 2FA required
      if (data?.twofa_required) {
        return {
          success: true,
          twofaRequired: true,
          tempToken: data.temp_token
        };
      }
      
      if (data?.token) {
        setStoredToken(data.token);
      }
      
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Login failed"),
        status: error?.response?.status
      };
    }
  },

  async verify2FA(token, tempToken) {
    try {
      const response = await mainApi.post("/api/auth/2fa/verify-login", {
        token,
        temp_token: tempToken,
      });
      const data = unwrap(response);
      if (data?.token) {
        setStoredToken(data.token);
      }
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "2FA verification failed"),
      };
    }
  },

  async logout() {
    clearStoredToken();
    return { success: true };
  },

  // ========================
  // USER PROFILE (Main API)
  // ========================
  async getCurrentUser() {
    try {
      const response = await mainApi.get("/api/me");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get user"),
      };
    }
  },

  async getActivationStatus() {
    try {
      const response = await mainApi.get("/api/me/activation-status");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get activation status"),
      };
    }
  },

  // ========================
  // INTEGRATIONS (Main API)
  // ========================
  async connectOKX(apiKey, apiSecret, passphrase, mode = "paper") {
    try {
      const response = await mainApi.post("/api/integrations/okx", {
        api_key: apiKey,
        api_secret: apiSecret,
        passphrase,
        mode,
      });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to connect OKX"),
      };
    }
  },

  async connectAlpaca(apiKey, apiSecret, mode = "paper") {
    try {
      const response = await mainApi.post("/api/integrations/alpaca", {
        api_key: apiKey,
        api_secret: apiSecret,
        mode,
      });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to connect Alpaca"),
      };
    }
  },

  async connectWallet(address) {
    try {
      const response = await mainApi.post("/api/integrations/wallet", {
        wallet: address,
      });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to connect wallet"),
      };
    }
  },

  async getIntegrationStatus() {
    try {
      const response = await mainApi.get("/api/integrations/status");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get integration status"),
      };
    }
  },

  // ========================
  // BILLING (Main API)
  // ========================
  async createSetupIntent() {
    try {
      const response = await mainApi.post("/api/billing/setup-intent");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to create setup intent"),
      };
    }
  },

  async getCardStatus() {
    try {
      const response = await mainApi.get("/api/billing/card-status");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get card status"),
      };
    }
  },

  async confirmCard() {
    try {
      const response = await mainApi.post("/api/billing/confirm-card");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to confirm card"),
      };
    }
  },

  // ========================
  // TRADING (Main API)
  // ========================
  async toggleTrading(enabled = true) {
    try {
      const response = await mainApi.post("/api/trading/enable", { enabled });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to toggle trading"),
      };
    }
  },

  async getTradingStatus() {
    try {
      const response = await mainApi.get("/api/trading/status");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get trading status"),
      };
    }
  },

  // ========================
  // BOT CONTROL (Bot API - port 8011)
  // ========================
  async startBot(mode = "paper", strategy = "ai_weighted") {
    try {
      const response = await botApi.post("/api/bot/start", {
        mode,
        strategy,
      });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to start bot"),
      };
    }
  },

  async stopBot() {
    try {
      const response = await botApi.post("/api/bot/stop");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to stop bot"),
      };
    }
  },

  async getBotStatus() {
    try {
      const response = await botApi.get("/health");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get bot status"),
      };
    }
  },

  // ========================
  // TRADES & STATS (Bot API - port 8011)
  // ========================
  async getTrades(limit = 100) {
    try {
      const response = await botApi.get(`/api/sniper/trades?limit=${limit}`);
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get trades"),
        data: { trades: [] } // Return empty array as fallback
      };
    }
  },

  async getAllStats() {
    try {
      const response = await botApi.get("/api/all/stats");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get stats"),
        data: {} // Return empty object as fallback
      };
    }
  },

  async getDashboardData() {
    try {
      const response = await botApi.get("/api/all/stats");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get dashboard data"),
        data: {} // Return empty object as fallback
      };
    }
  },

  async getDiscoveries(limit = 20) {
    try {
      const response = await botApi.get(`/api/sniper/discoveries?limit=${limit}`);
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get discoveries"),
        data: { discoveries: [] }
      };
    }
  },

  // ========================
  // PUBLIC ENDPOINTS (No auth required)
  // ========================
  async getPromoStatus() {
    try {
      const response = await mainApi.get("/api/promo/status");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get promo status"),
      };
    }
  },

  async claimPromo(email, tier = "starter", wallet = "") {
    try {
      const response = await mainApi.post("/api/promo/claim", {
        email,
        tier,
        wallet,
      });
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to claim promo"),
      };
    }
  },

  async getTiers() {
    try {
      const response = await mainApi.get("/api/public/tiers");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get tiers"),
      };
    }
  },

  async getLiveStats() {
    try {
      const response = await mainApi.get("/api/public/live-stats");
      return { success: true, data: unwrap(response) };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to get live stats"),
        data: {} // Return empty object as fallback
      };
    }
  },
};

// Export both the client and individual API instances if needed
export { mainApi, botApi };
export default ApiClient;
