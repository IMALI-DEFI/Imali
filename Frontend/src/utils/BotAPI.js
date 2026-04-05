// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";
const isBrowser = typeof window !== "undefined";

// ==============================================
// CONFIGURATION
// ==============================================

const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTTL: 60000, // 1 minute cache for non-sensitive data
};

// Simple in-memory cache
const cache = new Map();

const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (pattern) => {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
};

// ==============================================
// API CLIENT
// ==============================================

const api = axios.create({
  baseURL: API_BASE,
  timeout: API_CONFIG.timeout,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Request interceptor with retry logic
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.metadata = { startTime: Date.now() };
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      const duration = Date.now() - response.config.metadata.startTime;
      if (duration > 3000) {
        console.warn(`[BotAPI] Slow request: ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  async (error) => {
    const { config, response } = error;
    
    if (config && config.retryCount !== undefined) {
      const shouldRetry = !response || (response?.status >= 500 && response?.status < 600);
      if (shouldRetry && config.retryCount < API_CONFIG.retryAttempts) {
        config.retryCount += 1;
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * config.retryCount));
        return api(config);
      }
    } else if (config) {
      config.retryCount = 0;
      const shouldRetry = !response || (response?.status >= 500 && response?.status < 600);
      if (shouldRetry) {
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));
        return api(config);
      }
    }
    
    if (response?.status === 401) {
      const isAuthPage = isBrowser && (
        window.location.pathname.includes("/login") ||
        window.location.pathname.includes("/signup")
      );
      if (!isAuthPage) {
        clearToken();
        if (isBrowser) window.location.href = "/login?expired=true";
      }
    }
    
    return Promise.reject(error);
  }
);

// ==============================================
// TOKEN HELPERS
// ==============================================

export const getToken = () => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    console.warn("[BotAPI] Failed to get token:", e);
    return null;
  }
};

export const setToken = (token) => {
  if (!isBrowser) return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    console.warn("[BotAPI] Failed to set token:", e);
  }
};

export const clearToken = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.warn("[BotAPI] Failed to clear token:", e);
  }
};

export const isAuthenticated = () => !!getToken();

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

const unwrap = (response) => response?.data ?? response;

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message || fallbackMessage;
  console.error(`[BotAPI] ${fallbackMessage}:`, message);
  return { success: false, error: message, status: error?.response?.status };
};

// ==============================================
// AUTH API
// ==============================================

export const signup = async (userData) => {
  try {
    const response = await api.post("/api/auth/register", userData);
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    if (token) setToken(token);
    clearCache("user");
    clearCache("activation");
    return { success: true, data, token };
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    if (token) setToken(token);
    clearCache("user");
    clearCache("activation");
    return { success: true, data, token };
  } catch (error) {
    return handleApiError(error, "Login failed");
  }
};

export const logout = () => {
  clearToken();
  clearCache();
  if (isBrowser) window.location.href = "/login";
};

export const getMe = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_me");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/me");
    const data = unwrap(response);
    const userData = data?.data?.user || data?.user || data;
    if (userData && userData.id) {
      setCached("user_me", userData);
    }
    return userData;
  } catch (error) {
    console.error("[BotAPI] getMe failed:", error);
    throw error;
  }
};

export const getActivationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("activation_status");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/me/activation-status");
    const data = unwrap(response);
    const status = data?.data?.status || data?.status || data;
    
    const result = {
      has_card_on_file: status?.has_card_on_file || false,
      billing_complete: status?.billing_complete || false,
      trading_enabled: status?.trading_enabled || false,
      okx_connected: status?.okx_connected || false,
      alpaca_connected: status?.alpaca_connected || false,
      wallet_connected: status?.wallet_connected || false,
      tier: status?.tier || "starter",
      activation_complete: status?.activation_complete || false,
    };
    
    setCached("activation_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getActivationStatus failed:", error);
    return {
      has_card_on_file: false,
      billing_complete: false,
      trading_enabled: false,
      okx_connected: false,
      alpaca_connected: false,
      wallet_connected: false,
      tier: "starter",
      activation_complete: false,
    };
  }
};

export const refreshActivation = () => getActivationStatus(true);

// ==============================================
// BILLING API
// ==============================================

export const probeBillingRoutes = async () => {
  try {
    const response = await api.get("/api/billing/probe");
    const data = unwrap(response);
    const routes = data?.data?.routes || data?.routes || [];
    return {
      success: true,
      cardStatusAvailable: true,
      setupIntentAvailable: true,
      routes,
    };
  } catch (error) {
    console.warn("[BotAPI] probeBillingRoutes failed:", error);
    return {
      success: false,
      cardStatusAvailable: true,
      setupIntentAvailable: true,
      routes: [],
    };
  }
};

export const getCardStatus = async () => {
  try {
    const response = await api.get("/api/billing/card-status");
    const data = unwrap(response);
    return {
      success: true,
      has_card: data?.data?.has_card || data?.has_card || false,
      billing_complete: data?.data?.billing_complete || data?.billing_complete || false,
      card_details: data?.data?.card_details || null,
    };
  } catch (error) {
    console.warn("[BotAPI] getCardStatus failed:", error);
    return { success: false, has_card: false, billing_complete: false };
  }
};

export const createSetupIntent = async (payload) => {
  try {
    const response = await api.post("/api/billing/setup-intent", payload);
    const data = unwrap(response);
    return {
      success: true,
      client_secret: data?.data?.client_secret || data?.client_secret,
      setup_intent_id: data?.data?.setup_intent_id || data?.setup_intent_id,
    };
  } catch (error) {
    return handleApiError(error, "Failed to create setup intent");
  }
};

export const confirmCard = async (payload = {}) => {
  try {
    const response = await api.post("/api/billing/confirm-card", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    return {
      success: true,
      confirmed: data?.data?.confirmed || data?.confirmed || true,
    };
  } catch (error) {
    return handleApiError(error, "Failed to confirm card");
  }
};

// ==============================================
// CONNECTIONS API
// ==============================================

export const connectOKX = async (payload) => {
  try {
    const response = await api.post("/api/integrations/okx", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect OKX");
  }
};

export const connectAlpaca = async (payload) => {
  try {
    const response = await api.post("/api/integrations/alpaca", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect Alpaca");
  }
};

export const connectWallet = async (payload) => {
  try {
    const response = await api.post("/api/integrations/wallet", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect wallet");
  }
};

export const toggleTrading = async (enabled) => {
  try {
    const response = await api.post("/api/trading/enable", { enabled });
    const data = unwrap(response);
    clearCache("activation_status");
    return { success: true, enabled: data?.data?.enabled || data?.enabled || enabled };
  } catch (error) {
    return handleApiError(error, "Failed to toggle trading");
  }
};

// ==============================================
// REFERRAL API
// ==============================================

export const getReferralInfo = async () => {
  try {
    const response = await api.get("/api/referrals/info");
    const data = unwrap(response);
    return data?.data || data || { code: null, count: 0, earned: 0, pending: 0 };
  } catch (error) {
    console.warn("[BotAPI] getReferralInfo failed:", error);
    return { code: null, count: 0, earned: 0, pending: 0 };
  }
};

export const getReferralStats = async () => {
  try {
    const response = await api.get("/api/referrals/stats");
    const data = unwrap(response);
    return data?.data || data || { total_referrals: 0, total_earned: 0, pending_rewards: 0 };
  } catch (error) {
    console.warn("[BotAPI] getReferralStats failed:", error);
    return { total_referrals: 0, total_earned: 0, pending_rewards: 0 };
  }
};

export const getReferralHistory = async () => {
  try {
    const response = await api.get("/api/referrals/history");
    const data = unwrap(response);
    return data?.data || data || { referrals: [], earnings_history: [] };
  } catch (error) {
    console.warn("[BotAPI] getReferralHistory failed:", error);
    return { referrals: [], earnings_history: [] };
  }
};

export const validateReferralCode = async (code) => {
  try {
    const response = await api.post("/api/referrals/validate", { code });
    const data = unwrap(response);
    return data?.data || data || { valid: false };
  } catch (error) {
    console.warn("[BotAPI] validateReferralCode failed:", error);
    return { valid: false, error: error?.message };
  }
};

export const applyReferralCode = async (code) => {
  try {
    const response = await api.post("/api/referrals/apply", { code });
    const data = unwrap(response);
    return data?.data || data || { applied: true };
  } catch (error) {
    console.warn("[BotAPI] applyReferralCode failed:", error);
    return { applied: false, error: error?.message };
  }
};

export const claimReferralRewards = async (amount) => {
  try {
    const response = await api.post("/api/referrals/claim", { amount });
    const data = unwrap(response);
    return data?.data || data || { claimed: true };
  } catch (error) {
    console.warn("[BotAPI] claimReferralRewards failed:", error);
    return { claimed: false, error: error?.message };
  }
};

// ==============================================
// DASHBOARD API (with caching)
// ==============================================

export const getTrades = async (limit = 100, skipCache = false) => {
  const cacheKey = `trades_${limit}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await api.get(`/api/sniper/trades?limit=${limit}`);
    const data = unwrap(response);
    const result = data?.data?.trades || data?.trades || [];
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getTrades failed:", error);
    return [];
  }
};

export const getDiscoveries = async (limit = 20, skipCache = false) => {
  const cacheKey = `discoveries_${limit}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await api.get(`/api/sniper/discoveries?limit=${limit}`);
    const data = unwrap(response);
    const result = data?.data?.discoveries || data?.discoveries || [];
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getDiscoveries failed:", error);
    return [];
  }
};

export const getBotStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("bot_status");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/bot/status");
    const data = unwrap(response);
    const result = data?.data?.bots || data?.bots || [];
    setCached("bot_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getBotStatus failed:", error);
    return [];
  }
};

export const getAnalyticsSummary = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("analytics_summary");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/analytics/summary");
    const data = unwrap(response);
    const result = data?.data?.summary || data?.summary || { total_trades: 0, total_pnl: 0, wins: 0, losses: 0 };
    setCached("analytics_summary", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getAnalyticsSummary failed:", error);
    return { total_trades: 0, total_pnl: 0, wins: 0, losses: 0 };
  }
};

export const getPublicHistorical = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("public_historical");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/public/historical");
    const data = unwrap(response);
    const result = data?.data || data || { daily: [], weekly: [], monthly: [] };
    setCached("public_historical", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getPublicHistorical failed:", error);
    return { daily: [], weekly: [], monthly: [] };
  }
};

export const getPublicLiveStats = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("public_live_stats");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/public/live-stats");
    const data = unwrap(response);
    const result = data?.data || data || { total_pnl: 0, win_rate: 0, active_bots: 0 };
    setCached("public_live_stats", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getPublicLiveStats failed:", error);
    return { total_pnl: 0, win_rate: 0, active_bots: 0 };
  }
};

// ==============================================
// PROMO API
// ==============================================

export const getPromoStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("promo_status");
    if (cached) return cached;
  }
  
  try {
    const response = await api.get("/api/promo/status");
    const data = unwrap(response);
    const result = data?.data || data || { limit: 50, claimed: 0, spots_left: 50, active: true, fee_percent: 5 };
    setCached("promo_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getPromoStatus failed:", error);
    return { limit: 50, claimed: 0, spots_left: 50, active: true, fee_percent: 5 };
  }
};

export const claimPromo = async (email, tier, wallet) => {
  try {
    const response = await api.post("/api/promo/claim", { email, tier, wallet });
    const data = unwrap(response);
    clearCache("promo_status");
    return { success: true, data: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Claim failed");
  }
};

// ==============================================
// ADMIN API
// ==============================================

export const getAdminCheck = async () => {
  try {
    const response = await api.get("/api/admin/check");
    const data = unwrap(response);
    return { success: true, is_admin: data?.data?.is_admin || data?.is_admin || false };
  } catch (error) {
    return { success: false, is_admin: false };
  }
};

export const adminGetUsers = async (params = {}) => {
  try {
    const response = await api.get("/api/admin/users", { params });
    const data = unwrap(response);
    return { success: true, users: data?.data?.users || data?.users || [], count: data?.data?.count || 0 };
  } catch (error) {
    return handleApiError(error, "Failed to fetch users");
  }
};

export const adminUpdateUserTier = async (userId, tier) => {
  try {
    const response = await api.patch(`/api/admin/users/${userId}/tier`, { tier });
    const data = unwrap(response);
    clearCache("user_me");
    return { success: true, data: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to update user tier");
  }
};

// ==============================================
// MISC API
// ==============================================

export const forgotPassword = async (email) => {
  try {
    const response = await api.post("/api/auth/forgot-password", { email });
    const data = unwrap(response);
    return { success: true, message: data?.message || "Password reset email sent" };
  } catch (error) {
    return handleApiError(error, "Failed to send reset email");
  }
};

// ==============================================
// BOTAPI CLASS
// ==============================================

class BotAPIClass {
  constructor() {
    this.api = api;
  }
  
  // Token helpers
  setToken(token) { setToken(token); }
  getToken() { return getToken(); }
  clearToken() { clearToken(); }
  isAuthenticated() { return isAuthenticated(); }
  
  // Auth
  signup(userData) { return signup(userData); }
  login(email, password) { return login(email, password); }
  logout() { logout(); }
  getMe(skipCache) { return getMe(skipCache); }
  getActivationStatus(skipCache) { return getActivationStatus(skipCache); }
  activationStatus(skipCache) { return getActivationStatus(skipCache); }
  refreshActivation() { return refreshActivation(); }
  
  // Billing
  probeBillingRoutes() { return probeBillingRoutes(); }
  getCardStatus() { return getCardStatus(); }
  createSetupIntent(payload) { return createSetupIntent(payload); }
  confirmCard(payload) { return confirmCard(payload); }
  
  // Connections
  connectOKX(payload) { return connectOKX(payload); }
  connectAlpaca(payload) { return connectAlpaca(payload); }
  connectWallet(payload) { return connectWallet(payload); }
  toggleTrading(enabled) { return toggleTrading(enabled); }
  
  // Referral
  getReferralInfo() { return getReferralInfo(); }
  getReferralStats() { return getReferralStats(); }
  getReferralHistory() { return getReferralHistory(); }
  validateReferralCode(code) { return validateReferralCode(code); }
  applyReferralCode(code) { return applyReferralCode(code); }
  claimReferralRewards(amount) { return claimReferralRewards(amount); }
  
  // Dashboard
  getTrades(limit, skipCache) { return getTrades(limit, skipCache); }
  getDiscoveries(limit, skipCache) { return getDiscoveries(limit, skipCache); }
  getBotStatus(skipCache) { return getBotStatus(skipCache); }
  getAnalyticsSummary(skipCache) { return getAnalyticsSummary(skipCache); }
  getPublicHistorical(skipCache) { return getPublicHistorical(skipCache); }
  getPublicLiveStats(skipCache) { return getPublicLiveStats(skipCache); }
  
  // Promo
  getPromoStatus(skipCache) { return getPromoStatus(skipCache); }
  claimPromo(email, tier, wallet) { return claimPromo(email, tier, wallet); }
  
  // Admin
  getAdminCheck() { return getAdminCheck(); }
  adminGetUsers(params) { return adminGetUsers(params); }
  adminUpdateUserTier(userId, tier) { return adminUpdateUserTier(userId, tier); }
  
  // Misc
  forgotPassword(email) { return forgotPassword(email); }
  
  // Utilities
  clearCache(pattern) { clearCache(pattern); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;