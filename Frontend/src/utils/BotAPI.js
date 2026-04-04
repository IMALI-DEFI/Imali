// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";
const isBrowser = typeof window !== "undefined";

// Simple API client
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Token helpers
export const getToken = () => (isBrowser ? localStorage.getItem(TOKEN_KEY) : null);
export const setToken = (token) => {
  if (!isBrowser) return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
export const clearToken = () => {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEY);
};

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
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

const unwrap = (response) => response?.data ?? response;

// ========== AUTH API ==========
export const signup = async (userData) => {
  try {
    const response = await api.post("/api/auth/register", userData);
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    if (token) setToken(token);
    return { success: true, data, token };
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "Signup failed";
    return { success: false, error: message };
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    if (token) setToken(token);
    return { success: true, data, token };
  } catch (error) {
    const message = error?.response?.data?.message || error?.message || "Login failed";
    return { success: false, error: message };
  }
};

export const logout = () => {
  clearToken();
  if (isBrowser) window.location.href = "/login";
};

export const getMe = async () => {
  try {
    const response = await api.get("/api/me");
    const data = unwrap(response);
    
    // Extract user from response structure: { success: true, data: { user: {...} } }
    const userData = data?.data?.user || data?.user || data;
    
    return userData;
  } catch (error) {
    console.error("[BotAPI] getMe failed:", error);
    throw error;
  }
};

export const getActivationStatus = async () => {
  try {
    const response = await api.get("/api/me/activation-status");
    const data = unwrap(response);
    
    // Extract status from response
    const status = data?.data?.status || data?.status || data;
    
    return {
      has_card_on_file: status?.has_card_on_file || false,
      billing_complete: status?.billing_complete || false,
      trading_enabled: status?.trading_enabled || false,
      okx_connected: status?.okx_connected || false,
      alpaca_connected: status?.alpaca_connected || false,
      wallet_connected: status?.wallet_connected || false,
    };
  } catch (error) {
    console.warn("[BotAPI] getActivationStatus failed:", error);
    // Return default status
    return {
      has_card_on_file: false,
      billing_complete: false,
      trading_enabled: false,
      okx_connected: false,
      alpaca_connected: false,
      wallet_connected: false,
    };
  }
};

// ========== BILLING API ==========
export const getCardStatus = async () => {
  try {
    const response = await api.get("/api/billing/card-status");
    return unwrap(response);
  } catch {
    return { has_card: false };
  }
};

export const createSetupIntent = async (payload) => {
  const response = await api.post("/api/billing/setup-intent", payload);
  return unwrap(response);
};

// ========== CONNECTIONS API ==========
export const connectOKX = async (payload) => {
  const response = await api.post("/api/connections/okx", payload);
  return unwrap(response);
};

export const connectAlpaca = async (payload) => {
  const response = await api.post("/api/connections/alpaca", payload);
  return unwrap(response);
};

export const connectWallet = async (payload) => {
  const response = await api.post("/api/connections/wallet", payload);
  return unwrap(response);
};

export const toggleTrading = async (enabled) => {
  const response = await api.post("/api/trading/enable", { enabled });
  return unwrap(response);
};

// ========== DASHBOARD API ==========
export const getTrades = async (limit = 100) => {
  try {
    const response = await api.get(`/api/sniper/trades?limit=${limit}`);
    return unwrap(response);
  } catch {
    return { trades: [] };
  }
};

export const getDiscoveries = async (limit = 20) => {
  try {
    const response = await api.get(`/api/sniper/discoveries?limit=${limit}`);
    return unwrap(response);
  } catch {
    return { discoveries: [] };
  }
};

export const getBotStatus = async () => {
  try {
    const response = await api.get("/api/bot/status");
    return unwrap(response);
  } catch {
    return { bots: [] };
  }
};

export const getAnalyticsSummary = async () => {
  try {
    const response = await api.get("/api/analytics/summary");
    return unwrap(response);
  } catch {
    return { summary: { total_trades: 0, total_pnl: 0, wins: 0, losses: 0 } };
  }
};

export const getPublicHistorical = async () => {
  try {
    const response = await api.get("/api/public/historical");
    return unwrap(response);
  } catch {
    return { daily: [], weekly: [], monthly: [] };
  }
};

export const getPublicLiveStats = async () => {
  try {
    const response = await api.get("/api/public/live-stats");
    return unwrap(response);
  } catch {
    return { total_pnl: 0, win_rate: 0, active_bots: 0 };
  }
};

// ========== PROMO API ==========
export const getPromoStatus = async () => {
  try {
    const response = await api.get("/api/promo/status");
    return unwrap(response);
  } catch {
    return { limit: 50, claimed: 0, spots_left: 50, active: true, fee_percent: 5 };
  }
};

export const claimPromo = async (email, tier, wallet) => {
  try {
    const response = await api.post("/api/promo/claim", { email, tier, wallet });
    return unwrap(response);
  } catch (error) {
    return { success: false, error: error?.response?.data?.message || "Claim failed" };
  }
};

// ========== ADMIN API ==========
export const getAdminCheck = async () => {
  const response = await api.get("/api/admin/check");
  return unwrap(response);
};

export const adminGetUsers = async (params = {}) => {
  const response = await api.get("/api/admin/users", { params });
  return unwrap(response);
};

export const adminUpdateUserTier = async (userId, tier) => {
  const response = await api.patch(`/api/admin/users/${userId}/tier`, { tier });
  return unwrap(response);
};

// ========== MISC ==========
export const forgotPassword = async (email) => {
  const response = await api.post("/api/auth/forgot-password", { email });
  return unwrap(response);
};

// BotAPI Class for easy importing
class BotAPIClass {
  constructor() {
    this.api = api;
  }
  setToken(token) { setToken(token); }
  getToken() { return getToken(); }
  clearToken() { clearToken(); }
  signup(userData) { return signup(userData); }
  login(email, password) { return login(email, password); }
  logout() { logout(); }
  getMe() { return getMe(); }
  getActivationStatus() { return getActivationStatus(); }
  activationStatus() { return getActivationStatus(); }
  getCardStatus() { return getCardStatus(); }
  createSetupIntent(payload) { return createSetupIntent(payload); }
  connectOKX(payload) { return connectOKX(payload); }
  connectAlpaca(payload) { return connectAlpaca(payload); }
  connectWallet(payload) { return connectWallet(payload); }
  toggleTrading(enabled) { return toggleTrading(enabled); }
  getTrades(limit) { return getTrades(limit); }
  getDiscoveries(limit) { return getDiscoveries(limit); }
  getBotStatus() { return getBotStatus(); }
  getAnalyticsSummary() { return getAnalyticsSummary(); }
  getPublicHistorical() { return getPublicHistorical(); }
  getPublicLiveStats() { return getPublicLiveStats(); }
  getPromoStatus() { return getPromoStatus(); }
  claimPromo(email, tier, wallet) { return claimPromo(email, tier, wallet); }
  getAdminCheck() { return getAdminCheck(); }
  adminGetUsers(params) { return adminGetUsers(params); }
  adminUpdateUserTier(userId, tier) { return adminUpdateUserTier(userId, tier); }
  forgotPassword(email) { return forgotPassword(email); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;
