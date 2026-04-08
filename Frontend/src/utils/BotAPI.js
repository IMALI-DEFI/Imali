// src/utils/BotAPI.js
import axios from "axios";

// Use relative paths - Netlify will proxy these to your backend
const API_BASE = "http://129.213.90.84:3002";
const USER_API_BASE = "http://129.213.90.84:3002";
const SNIPER_API_BASE = "http://129.213.90.84:5004";

const TOKEN_KEY = "imali_token";
const API_KEY_KEY = "imali_api_key";
const isBrowser = typeof window !== "undefined";

// ==============================================
// CONFIGURATION
// ==============================================

const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheTTL: 60000,
  maxConcurrentRequests: 5,
};

// Request queue for rate limiting
let activeRequests = 0;
const requestQueue = [];

const processQueue = async () => {
  if (requestQueue.length === 0 || activeRequests >= API_CONFIG.maxConcurrentRequests) {
    return;
  }
  
  activeRequests++;
  const { resolve, reject, request } = requestQueue.shift();
  
  try {
    const result = await request();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    activeRequests--;
    processQueue();
  }
};

const rateLimitRequest = (requestFn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, request: requestFn });
    processQueue();
  });
};

// Simple in-memory cache with TTL
const cache = new Map();

const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  return null;
};

const setCached = (key, data, ttl = API_CONFIG.cacheTTL) => {
  cache.set(key, { data, timestamp: Date.now(), ttl });
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > v.ttl) {
        cache.delete(k);
      }
    }
  }
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
// API CLIENTS
// ==============================================

const publicApi = axios.create({
  baseURL: API_BASE,
  timeout: API_CONFIG.timeout,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

const userApi = axios.create({
  baseURL: USER_API_BASE,
  timeout: API_CONFIG.timeout,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

const sniperApi = axios.create({
  baseURL: SNIPER_API_BASE,
  timeout: API_CONFIG.timeout,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Add token to userApi and sniperApi requests
const addAuthInterceptor = (apiClient) => {
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const apiKey = getApiKey();
    if (apiKey) {
      config.headers["X-API-Key"] = apiKey;
    }
    
    config.metadata = { startTime: Date.now() };
    return config;
  });
};

addAuthInterceptor(userApi);
addAuthInterceptor(sniperApi);

// Response interceptor for error handling
const addResponseInterceptor = (apiClient) => {
  apiClient.interceptors.response.use(
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
      
      if (!response && config?.retryCount < API_CONFIG.retryAttempts) {
        config.retryCount = (config.retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay * config.retryCount));
        return apiClient(config);
      }
      
      if (response?.status === 401) {
        const isAuthPage = isBrowser && (
          window.location.pathname.includes("/login") ||
          window.location.pathname.includes("/signup")
        );
        if (!isAuthPage) {
          clearToken();
          clearApiKey();
          if (isBrowser) window.location.href = "/login?expired=true";
        }
      }
      
      return Promise.reject(error);
    }
  );
};

addResponseInterceptor(userApi);
addResponseInterceptor(sniperApi);

// ==============================================
// TOKEN & API KEY HELPERS
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

export const getApiKey = () => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(API_KEY_KEY);
  } catch (e) {
    console.warn("[BotAPI] Failed to get API key:", e);
    return null;
  }
};

export const setApiKey = (apiKey) => {
  if (!isBrowser) return;
  try {
    if (apiKey) {
      localStorage.setItem(API_KEY_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_KEY);
    }
  } catch (e) {
    console.warn("[BotAPI] Failed to set API key:", e);
  }
};

export const clearApiKey = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch (e) {
    console.warn("[BotAPI] Failed to clear API key:", e);
  }
};

export const isAuthenticated = () => !!getToken();

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

const unwrap = (response) => response?.data ?? response;

const handleApiError = (error, fallbackMessage) => {
  const message = error?.response?.data?.message || 
                  error?.response?.data?.error || 
                  error?.message || 
                  fallbackMessage;
  console.error(`[BotAPI] ${fallbackMessage}:`, message);
  return { success: false, error: message, status: error?.response?.status };
};

// ==============================================
// SNIPER BOT API
// ==============================================

export const validateSniperApiKey = async (apiKey, skipCache = false) => {
  const cacheKey = `sniper_validate_${apiKey}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await sniperApi.post("/api/v1/validate", { api_key: apiKey });
    const data = unwrap(response);
    const result = {
      valid: data?.valid || false,
      user: data?.user || null
    };
    if (result.valid) {
      setCached(cacheKey, result, 300000);
    }
    return result;
  } catch (error) {
    console.warn("[BotAPI] validateSniperApiKey failed:", error);
    return { valid: false, user: null };
  }
};

export const getSniperTradingLimits = async () => {
  const apiKey = getApiKey();
  if (!apiKey) return { daily_trades: 0, daily_trades_used: 0, position_size_usd: 0, remaining_trades: 0 };
  
  try {
    const response = await sniperApi.get("/api/v1/trading-limits", {
      headers: { "X-API-Key": apiKey }
    });
    const data = unwrap(response);
    return {
      daily_trades: data?.daily_trades || 0,
      daily_trades_used: data?.daily_trades_used || 0,
      position_size_usd: data?.position_size_usd || 0,
      remaining_trades: data?.remaining_trades || 0,
      total_volume_today_usd: data?.total_volume_today_usd || 0
    };
  } catch (error) {
    console.warn("[BotAPI] getSniperTradingLimits failed:", error);
    return { daily_trades: 0, daily_trades_used: 0, position_size_usd: 0, remaining_trades: 0 };
  }
};

export const getSniperBalance = async () => {
  const apiKey = getApiKey();
  if (!apiKey) return { balance_usd: 0, balance_eth: 0, available_for_trading: 0 };
  
  try {
    const response = await sniperApi.get("/api/v1/balance", {
      headers: { "X-API-Key": apiKey }
    });
    const data = unwrap(response);
    return {
      balance_usd: data?.balance_usd || 0,
      balance_eth: data?.balance_eth || 0,
      available_for_trading: data?.available_for_trading || 0
    };
  } catch (error) {
    console.warn("[BotAPI] getSniperBalance failed:", error);
    return { balance_usd: 0, balance_eth: 0, available_for_trading: 0 };
  }
};

export const trackSniperTrade = async (tradeData) => {
  const apiKey = getApiKey();
  if (!apiKey) return { success: false, error: "No API key" };
  
  try {
    const response = await sniperApi.post("/api/v1/track-trade", tradeData, {
      headers: { "X-API-Key": apiKey }
    });
    const data = unwrap(response);
    clearCache("user_trades");
    clearCache("user_stats");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to track trade");
  }
};

export const verifySniper2FA = async (code) => {
  const apiKey = getApiKey();
  if (!apiKey) return { verified: false };
  
  try {
    const response = await sniperApi.post("/api/v1/verify-2fa", { code }, {
      headers: { "X-API-Key": apiKey }
    });
    const data = unwrap(response);
    return { verified: data?.verified || false };
  } catch (error) {
    console.warn("[BotAPI] verifySniper2FA failed:", error);
    return { verified: false };
  }
};

// ==============================================
// PUBLIC DASHBOARD API
// ==============================================

export const getPublicLiveStats = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("public_live_stats");
    if (cached) return cached;
  }
  
  try {
    const response = await publicApi.get("/api/public/live-stats");
    const data = unwrap(response);
    const result = data?.data || data || { summary: {}, bots: [], recent_trades: [] };
    setCached("public_live_stats", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getPublicLiveStats failed:", error);
    return { summary: {}, bots: [], recent_trades: [] };
  }
};

export const getPublicHistorical = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("public_historical");
    if (cached) return cached;
  }
  
  try {
    const response = await publicApi.get("/api/public/historical");
    const data = unwrap(response);
    const result = data?.data || data || { daily: [], weekly: [], monthly: [] };
    setCached("public_historical", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getPublicHistorical failed:", error);
    return { daily: [], weekly: [], monthly: [] };
  }
};

export const getNotableTrades = async (limit = 10, skipCache = false) => {
  const cacheKey = `notable_trades_${limit}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await publicApi.get(`/api/notable-trades?limit=${limit}`);
    const data = unwrap(response);
    const result = data?.data || data || { okx: [], futures: [], stocks: [], sniper: [] };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getNotableTrades failed:", error);
    return { okx: [], futures: [], stocks: [], sniper: [] };
  }
};

export const getBotStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("bot_status");
    if (cached) return cached;
  }
  
  try {
    const response = await publicApi.get("/api/bot/status");
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
    const response = await publicApi.get("/api/analytics/summary");
    const data = unwrap(response);
    const result = data?.data?.summary || data?.summary || { total_trades: 0, total_pnl: 0, wins: 0, losses: 0 };
    setCached("analytics_summary", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getAnalyticsSummary failed:", error);
    return { total_trades: 0, total_pnl: 0, wins: 0, losses: 0 };
  }
};

// ==============================================
// USER-SPECIFIC API
// ==============================================

export const getUserTrades = async (options = {}) => {
  const { limit = 100, status, bot, skipCache = false } = options;
  const cacheKey = `user_trades_${limit}_${status}_${bot}`;
  
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  let url = `/api/user/trades?limit=${limit}`;
  if (status) url += `&status=${status}`;
  if (bot) url += `&bot=${bot}`;
  
  try {
    const response = await userApi.get(url);
    const data = unwrap(response);
    const result = {
      success: true,
      trades: data?.data?.trades || [],
      summary: data?.data?.summary || { total_trades: 0, total_pnl: 0, wins: 0, losses: 0, win_rate: 0 }
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[BotAPI] getUserTrades failed:", error);
    return { success: false, trades: [], summary: { total_trades: 0, total_pnl: 0, wins: 0, losses: 0, win_rate: 0 }, error: error.message };
  }
};

export const getUserPositions = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_positions");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/user/positions");
    const data = unwrap(response);
    const result = {
      success: true,
      positions: data?.data?.positions || [],
      count: data?.data?.count || 0
    };
    setCached("user_positions", result);
    return result;
  } catch (error) {
    console.error("[BotAPI] getUserPositions failed:", error);
    return { success: false, positions: [], count: 0, error: error.message };
  }
};

export const getUserBotExecutions = async (limit = 50, skipCache = false) => {
  const cacheKey = `user_bot_executions_${limit}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get(`/api/user/bot-executions?limit=${limit}`);
    const data = unwrap(response);
    const result = {
      success: true,
      executions: data?.data?.executions || [],
      count: data?.data?.count || 0
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[BotAPI] getUserBotExecutions failed:", error);
    return { success: false, executions: [], count: 0, error: error.message };
  }
};

export const getUserTradingStats = async (days = 30, skipCache = false) => {
  const cacheKey = `user_trading_stats_${days}`;
  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get(`/api/user/trading-stats?days=${days}`);
    const data = unwrap(response);
    const result = data?.data || data || { summary: {}, daily_performance: [] };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[BotAPI] getUserTradingStats failed:", error);
    return { summary: {}, daily_performance: [] };
  }
};

export const getUserStats = async () => {
  try {
    const [tradesRes, positionsRes] = await Promise.all([
      getUserTrades({ limit: 1000 }),
      getUserPositions()
    ]);
    
    return {
      success: true,
      stats: {
        total_trades: tradesRes.summary?.total_trades || 0,
        total_pnl: tradesRes.summary?.total_pnl || 0,
        wins: tradesRes.summary?.wins || 0,
        losses: tradesRes.summary?.losses || 0,
        win_rate: tradesRes.summary?.win_rate || 0,
        open_positions: positionsRes.count || 0
      }
    };
  } catch (error) {
    console.error("[BotAPI] getUserStats failed:", error);
    return { success: false, stats: { total_trades: 0, total_pnl: 0, wins: 0, losses: 0, win_rate: 0, open_positions: 0 } };
  }
};

// ==============================================
// AUTH API
// ==============================================

export const signup = async (userData) => {
  try {
    const response = await userApi.post("/api/auth/register", userData);
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    const apiKey = data?.data?.user?.api_key || data?.api_key;
    
    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);
    
    clearCache("user");
    clearCache("activation");
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
};

export const login = async (email, password) => {
  try {
    const response = await userApi.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.token || data?.data?.token;
    const apiKey = data?.data?.user?.api_key || data?.api_key;
    
    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);
    
    clearCache("user");
    clearCache("activation");
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Login failed");
  }
};

export const logout = () => {
  clearToken();
  clearApiKey();
  clearCache();
  if (isBrowser) window.location.href = "/login";
};

export const getMe = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_me");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/me");
    const data = unwrap(response);
    const userData = data?.data?.user || data?.user || data;
    if (userData && userData.id) {
      setCached("user_me", userData);
      if (userData.api_key) setApiKey(userData.api_key);
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
    const response = await userApi.get("/api/me/activation-status");
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
      tier_requirements_met: status?.tier_requirements_met || false,
      tier_required_integration: status?.tier_required_integration || "Alpaca & OKX (both)"
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
      tier_requirements_met: false,
      tier_required_integration: "Alpaca & OKX (both)"
    };
  }
};

export const refreshActivation = () => getActivationStatus(true);

// ==============================================
// BILLING API
// ==============================================

export const probeBillingRoutes = async () => {
  try {
    const response = await userApi.get("/api/billing/probe");
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
    return { success: false, cardStatusAvailable: true, setupIntentAvailable: true, routes: [] };
  }
};

export const getCardStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("card_status");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/billing/card-status");
    const data = unwrap(response);
    const result = {
      success: true,
      has_card: data?.data?.has_card || data?.has_card || false,
      billing_complete: data?.data?.billing_complete || data?.billing_complete || false,
      card_details: data?.data?.card_details || null,
    };
    setCached("card_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getCardStatus failed:", error);
    return { success: false, has_card: false, billing_complete: false };
  }
};

export const createSetupIntent = async (payload) => {
  try {
    const response = await userApi.post("/api/billing/setup-intent", payload);
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
    if (!payload.setup_intent_id) {
      console.warn("[BotAPI] confirmCard called without setup_intent_id");
      return { success: true, confirmed: true, demo: true };
    }
    
    const response = await userApi.post("/api/billing/confirm-card", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    clearCache("card_status");
    
    return { 
      success: true, 
      confirmed: data?.data?.confirmed || data?.confirmed || true,
      message: data?.message || "Card confirmed successfully"
    };
  } catch (error) {
    console.error("[BotAPI] confirmCard error:", error);
    
    if (error?.response?.status === 404 || error?.response?.status === 500) {
      console.warn("[BotAPI] confirmCard endpoint not available, using demo mode");
      return { success: true, confirmed: true, demo: true };
    }
    
    return { success: false, confirmed: false, error: error?.response?.data?.message || error?.message };
  }
};

// ==============================================
// INTEGRATIONS API
// ==============================================

export const connectOKX = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/okx", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    clearCache("integration_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect OKX");
  }
};

export const connectAlpaca = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/alpaca", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    clearCache("integration_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect Alpaca");
  }
};

export const connectWallet = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/wallet", payload);
    const data = unwrap(response);
    clearCache("activation_status");
    clearCache("integration_status");
    return { success: true, data };
  } catch (error) {
    return handleApiError(error, "Failed to connect wallet");
  }
};

export const toggleTrading = async (enabled) => {
  try {
    const response = await userApi.post("/api/trading/enable", { enabled });
    const data = unwrap(response);
    clearCache("activation_status");
    return { success: true, enabled: data?.data?.enabled || data?.enabled || enabled };
  } catch (error) {
    return handleApiError(error, "Failed to toggle trading");
  }
};

export const getIntegrationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("integration_status");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/integrations/status");
    const data = unwrap(response);
    const result = data?.data || data || { wallet_connected: false, alpaca_connected: false, okx_connected: false };
    setCached("integration_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getIntegrationStatus failed:", error);
    return { wallet_connected: false, alpaca_connected: false, okx_connected: false };
  }
};

// ==============================================
// REFERRAL API
// ==============================================

export const getReferralInfo = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("referral_info");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/referrals/info");
    const data = unwrap(response);
    const result = data?.data || data || { code: null, count: 0, earned: 0, pending: 0 };
    setCached("referral_info", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralInfo failed:", error);
    return { code: null, count: 0, earned: 0, pending: 0 };
  }
};

export const getReferralStats = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("referral_stats");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/referrals/stats");
    const data = unwrap(response);
    const result = data?.data || data || { total_referrals: 0, total_earned: 0, pending_rewards: 0 };
    setCached("referral_stats", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralStats failed:", error);
    return { total_referrals: 0, total_earned: 0, pending_rewards: 0 };
  }
};

export const getReferralHistory = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("referral_history");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/referrals/history");
    const data = unwrap(response);
    const result = data?.data || data || { referrals: [], earnings_history: [] };
    setCached("referral_history", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralHistory failed:", error);
    return { referrals: [], earnings_history: [] };
  }
};

export const validateReferralCode = async (code) => {
  try {
    const response = await userApi.post("/api/referrals/validate", { code });
    const data = unwrap(response);
    return data?.data || data || { valid: false };
  } catch (error) {
    console.warn("[BotAPI] validateReferralCode failed:", error);
    return { valid: false, error: error?.message };
  }
};

export const applyReferralCode = async (code) => {
  try {
    const response = await userApi.post("/api/referrals/apply", { code });
    const data = unwrap(response);
    clearCache("referral_info");
    return data?.data || data || { applied: true };
  } catch (error) {
    console.warn("[BotAPI] applyReferralCode failed:", error);
    return { applied: false, error: error?.message };
  }
};

export const claimReferralRewards = async (amount) => {
  try {
    const response = await userApi.post("/api/referrals/claim", { amount });
    const data = unwrap(response);
    clearCache("referral_info");
    clearCache("referral_stats");
    return data?.data || data || { claimed: true };
  } catch (error) {
    console.warn("[BotAPI] claimReferralRewards failed:", error);
    return { claimed: false, error: error?.message };
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
    const response = await userApi.get("/api/promo/status");
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
    const response = await userApi.post("/api/promo/claim", { email, tier, wallet });
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

export const getAdminCheck = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("admin_check");
    if (cached) return cached;
  }
  
  try {
    const response = await userApi.get("/api/admin/check");
    const data = unwrap(response);
    const result = { success: true, is_admin: data?.data?.is_admin || data?.is_admin || false };
    setCached("admin_check", result);
    return result;
  } catch (error) {
    return { success: false, is_admin: false };
  }
};

export const adminGetUsers = async (params = {}) => {
  try {
    const response = await userApi.get("/api/admin/users", { params });
    const data = unwrap(response);
    return { success: true, users: data?.data?.users || data?.users || [], count: data?.data?.count || 0 };
  } catch (error) {
    return handleApiError(error, "Failed to fetch users");
  }
};

export const adminUpdateUserTier = async (userId, tier) => {
  try {
    const response = await userApi.patch(`/api/admin/users/${userId}/tier`, { tier });
    const data = unwrap(response);
    clearCache("user_me");
    return { success: true, data: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to update user tier");
  }
};

export const adminRevokeApiKey = async (userId) => {
  try {
    const response = await userApi.post(`/api/admin/users/${userId}/revoke-api-key`);
    const data = unwrap(response);
    return { success: true, data: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to revoke API key");
  }
};

// ==============================================
// MISC API
// ==============================================

export const forgotPassword = async (email) => {
  try {
    const response = await userApi.post("/api/auth/forgot-password", { email });
    const data = unwrap(response);
    return { success: true, message: data?.message || "Password reset email sent" };
  } catch (error) {
    return handleApiError(error, "Failed to send reset email");
  }
};

// ==============================================
// LEGACY/COMPATIBILITY WRAPPERS
// ==============================================

export const getTrades = async (limit = 100) => {
  console.warn("[BotAPI] getTrades is deprecated. Use getUserTrades() instead.");
  const result = await getUserTrades({ limit });
  return result.trades || [];
};

export const getDiscoveries = async (limit = 20) => {
  console.warn("[BotAPI] getDiscoveries is deprecated.");
  return [];
};

// ==============================================
// BOTAPI CLASS
// ==============================================

class BotAPIClass {
  constructor() {
    this.api = userApi;
    this.sniperApi = sniperApi;
  }
  
  setToken(token) { setToken(token); }
  getToken() { return getToken(); }
  clearToken() { clearToken(); }
  setApiKey(apiKey) { setApiKey(apiKey); }
  getApiKey() { return getApiKey(); }
  clearApiKey() { clearApiKey(); }
  isAuthenticated() { return isAuthenticated(); }
  
  validateSniperApiKey(apiKey, skipCache) { return validateSniperApiKey(apiKey, skipCache); }
  getSniperTradingLimits() { return getSniperTradingLimits(); }
  getSniperBalance() { return getSniperBalance(); }
  trackSniperTrade(tradeData) { return trackSniperTrade(tradeData); }
  verifySniper2FA(code) { return verifySniper2FA(code); }
  
  signup(userData) { return signup(userData); }
  login(email, password) { return login(email, password); }
  logout() { logout(); }
  getMe(skipCache) { return getMe(skipCache); }
  getActivationStatus(skipCache) { return getActivationStatus(skipCache); }
  activationStatus(skipCache) { return getActivationStatus(skipCache); }
  refreshActivation() { return refreshActivation(); }
  
  getPublicLiveStats(skipCache) { return getPublicLiveStats(skipCache); }
  getPublicHistorical(skipCache) { return getPublicHistorical(skipCache); }
  getNotableTrades(limit, skipCache) { return getNotableTrades(limit, skipCache); }
  getBotStatus(skipCache) { return getBotStatus(skipCache); }
  getAnalyticsSummary(skipCache) { return getAnalyticsSummary(skipCache); }
  
  getUserTrades(options) { return getUserTrades(options); }
  getUserPositions(skipCache) { return getUserPositions(skipCache); }
  getUserBotExecutions(limit, skipCache) { return getUserBotExecutions(limit, skipCache); }
  getUserTradingStats(days, skipCache) { return getUserTradingStats(days, skipCache); }
  getUserStats() { return getUserStats(); }
  
  probeBillingRoutes() { return probeBillingRoutes(); }
  getCardStatus(skipCache) { return getCardStatus(skipCache); }
  createSetupIntent(payload) { return createSetupIntent(payload); }
  confirmCard(payload) { return confirmCard(payload); }
  
  connectOKX(payload) { return connectOKX(payload); }
  connectAlpaca(payload) { return connectAlpaca(payload); }
  connectWallet(payload) { return connectWallet(payload); }
  toggleTrading(enabled) { return toggleTrading(enabled); }
  getIntegrationStatus(skipCache) { return getIntegrationStatus(skipCache); }
  
  getReferralInfo(skipCache) { return getReferralInfo(skipCache); }
  getReferralStats(skipCache) { return getReferralStats(skipCache); }
  getReferralHistory(skipCache) { return getReferralHistory(skipCache); }
  validateReferralCode(code) { return validateReferralCode(code); }
  applyReferralCode(code) { return applyReferralCode(code); }
  claimReferralRewards(amount) { return claimReferralRewards(amount); }
  
  getPromoStatus(skipCache) { return getPromoStatus(skipCache); }
  claimPromo(email, tier, wallet) { return claimPromo(email, tier, wallet); }
  
  getAdminCheck(skipCache) { return getAdminCheck(skipCache); }
  adminGetUsers(params) { return adminGetUsers(params); }
  adminUpdateUserTier(userId, tier) { return adminUpdateUserTier(userId, tier); }
  adminRevokeApiKey(userId) { return adminRevokeApiKey(userId); }
  
  forgotPassword(email) { return forgotPassword(email); }
  
  clearCache(pattern) { clearCache(pattern); }
  
  getTrades(limit) { return getTrades(limit); }
  getDiscoveries(limit) { return getDiscoveries(limit); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;
