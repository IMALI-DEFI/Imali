// src/utils/BotAPI.js - COMPLETE VERSION (All methods including missing ones)
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const USER_API_BASE = process.env.REACT_APP_USER_API_BASE_URL || API_BASE;
const SNIPER_API_BASE = process.env.REACT_APP_SNIPER_API_BASE_URL || API_BASE;

const TOKEN_KEY = "imali_token";
const API_KEY_KEY = "imali_api_key";
const isBrowser = typeof window !== "undefined";

const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 900,
  cacheTTL: 60000,
  rateLimitCooldown: 2500,
};

const SESSION_CHECK_ENDPOINTS = [
  "/api/me",
  "/api/auth/verify",
  "/api/me/activation-status",
  "/api/me/trial-status",
];

const cache = new Map();
const inflight = new Map();
const lastRequestAt = new Map();

const VALID_TIERS = ["starter", "pro", "elite", "rare", "epic", "legendary", "common", "stock", "bundle", "enterprise"];

/* ================= CACHE HELPERS ================= */

const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (String(key).includes(pattern)) {
      cache.delete(key);
    }
  }
};

const clearTradingCache = () => {
  clearCache("activation_status");
  clearCache("trial_status");
  clearCache("integration_status");
  clearCache("user_me");
  clearCache("user_trading_stats");
  clearCache("user_positions");
  clearCache("user_trades");
  clearCache("user_bot_executions");
  clearCache("trading_strategies");
  clearCache("enterprise_org_users");
  clearCache("enterprise_strategies");
  clearCache("live_trading_stats");
  clearCache("exchange_balance");
  clearCache("card_status");
};

/* ================= STORAGE HELPERS ================= */

export const getToken = () => {
  if (!isBrowser) return null;

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!isBrowser) return;

  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("[BotAPI] Failed to save token:", err);
  }
};

export const clearToken = () => {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("[BotAPI] Failed to clear token:", err);
  }
};

export const getApiKey = () => {
  if (!isBrowser) return null;

  try {
    return localStorage.getItem(API_KEY_KEY);
  } catch {
    return null;
  }
};

export const setApiKey = (apiKey) => {
  if (!isBrowser) return;

  try {
    if (apiKey) localStorage.setItem(API_KEY_KEY, apiKey);
    else localStorage.removeItem(API_KEY_KEY);
  } catch (err) {
    console.error("[BotAPI] Failed to save API key:", err);
  }
};

export const clearApiKey = () => {
  if (!isBrowser) return;

  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch (err) {
    console.error("[BotAPI] Failed to clear API key:", err);
  }
};

export const isAuthenticated = () => !!getToken();

/* ================= RESPONSE / ERROR HELPERS ================= */

const unwrap = (response) => response?.data ?? response;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getErrorMessage = (error, fallbackMessage = "Request failed") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallbackMessage;

const handleApiError = (error, fallbackMessage) => ({
  success: false,
  error: getErrorMessage(error, fallbackMessage),
  status: error?.response?.status,
  rate_limited: error?.response?.status === 429,
});

const shouldForceLogout = (url = "") =>
  SESSION_CHECK_ENDPOINTS.some((endpoint) => String(url).includes(endpoint));

const redirectToLogin = () => {
  if (!isBrowser) return;

  const path = window.location.pathname;

  if (!path.includes("/login") && !path.includes("/signup")) {
    window.location.href = "/login?expired=true";
  }
};

const shouldRetry = (error) => {
  const status = error?.response?.status;

  if (!error?.response) return true;
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500) return true;

  return false;
};

const normalizeBool = (value, fallback = false) => {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === 1) return true;
  if (value === 0) return false;
  return fallback;
};

const makeRequestKey = (method, url, data) =>
  `${String(method || "get").toUpperCase()} ${url} ${data ? JSON.stringify(data) : ""}`;

const throttleRequest = async (key) => {
  const last = lastRequestAt.get(key) || 0;
  const elapsed = Date.now() - last;

  if (elapsed < API_CONFIG.rateLimitCooldown) {
    await wait(API_CONFIG.rateLimitCooldown - elapsed);
  }

  lastRequestAt.set(key, Date.now());
};

// Define requestWithDedupe BEFORE any API functions
const requestWithDedupe = async (client, config, options = {}) => {
  const method = String(config.method || "get").toLowerCase();
  const url = config.url || "";
  const data = config.data || null;
  const key = makeRequestKey(method, url, data);

  if (options.throttle !== false) {
    await throttleRequest(key);
  }

  if (method === "get" && inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = client(config).finally(() => {
    inflight.delete(key);
  });

  if (method === "get") {
    inflight.set(key, promise);
  }

  return promise;
};

/* ================= AXIOS INSTANCES ================= */

const createApiClient = (baseURL) =>
  axios.create({
    baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

const publicApi = createApiClient(API_BASE);
const userApi = createApiClient(USER_API_BASE);
const sniperApi = createApiClient(SNIPER_API_BASE);

const addAuthInterceptor = (apiClient) => {
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    const apiKey = getApiKey();

    config.headers = config.headers || {};

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (apiKey) config.headers["X-API-Key"] = apiKey;

    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error?.config || {};
      const status = error?.response?.status;
      const url = config?.url || "";

      if ((status === 401 || status === 403) && shouldForceLogout(url)) {
        clearToken();
        clearApiKey();
        clearCache();
        redirectToLogin();
        return Promise.reject(error);
      }

      if (shouldRetry(error) && config && (config.__retryCount || 0) < API_CONFIG.retryAttempts) {
        config.__retryCount = (config.__retryCount || 0) + 1;

        const retryAfter = Number(error?.response?.headers?.["retry-after"] || 0);
        const delay = retryAfter > 0 ? retryAfter * 1000 : API_CONFIG.retryDelay * config.__retryCount;

        await wait(delay);
        return apiClient(config);
      }

      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(userApi);
addAuthInterceptor(sniperApi);

/* ================= LOW-LEVEL REQUEST EXPORT ================= */

export const request = async (url, options = {}) => {
  const method = String(options.method || "GET").toLowerCase();
  const body = options.body ? JSON.parse(options.body) : options.data;

  try {
    const response = await requestWithDedupe(userApi, {
      url,
      method,
      data: body,
      params: options.params,
    });

    return unwrap(response);
  } catch (error) {
    throw {
      ...error,
      message: getErrorMessage(error, "Request failed"),
      status: error?.response?.status,
    };
  }
};

/* ================= DEFAULTS ================= */

const getDefaultActivationStatus = () => ({
  has_card_on_file: false,
  billing_complete: false,
  trading_enabled: false,
  paper_trading_enabled: false,
  okx_connected: false,
  alpaca_connected: false,
  wallet_connected: false,
  tier: "starter",
  activation_complete: false,
  tier_requirements_met: false,
  tier_required_integration: "Alpaca & OKX (both)",
  enterprise_approved: false,
  custom_strategy_access: false,
  admin_panel_enabled: false,
});

const getDefaultTrialStatus = () => ({
  trial_status: "inactive",
  paper_trading_enabled: false,
  seconds_remaining: 0,
  active: false,
  trial_started_at: null,
  trial_ends_at: null,
});

const getDefaultStrategies = () => ({
  success: true,
  strategies: [
    { id: "mean_reversion", name: "Mean Reversion", description: "Looks for dips and safe rebounds", risk_level: "low", min_tier: "starter", is_default: false },
    { id: "ai_weighted", name: "AI Weighted", description: "Smart mix of signals", risk_level: "medium", min_tier: "starter", is_default: true },
    { id: "momentum", name: "Momentum", description: "Follows strong trends", risk_level: "high", min_tier: "starter", is_default: false },
    { id: "arbitrage", name: "Arbitrage", description: "Profits from price differences", risk_level: "low", min_tier: "rare", is_default: false },
    { id: "futures", name: "Futures Engine", description: "Higher-speed crypto futures execution", risk_level: "high", min_tier: "epic", is_default: false },
    { id: "alpha", name: "Alpha Sniper", description: "Premium entries and signals", risk_level: "high", min_tier: "legendary", is_default: false },
  ],
  current_strategy: "ai_weighted",
  tier: "starter",
  count: 6,
  _fallback: true,
});

const getDefaultLiveStats = () => ({
  summary: { total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_balance: 0 },
  daily_performance: [],
  recent_trades: [],
});

/* ================= LIVE TRADING METHODS ================= */

const getLiveTradingStats = async (skipCache = false) => {
  const cacheKey = "live_trading_stats";

  if (!skipCache) {
    const cached = getCached(cacheKey, 20000);
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultLiveStats();

  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/live-stats",
    });

    const data = unwrap(response);
    const result = data?.data || data || getDefaultLiveStats();

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] Failed to load live trading stats:", error);
    return getDefaultLiveStats();
  }
};

const getExchangeBalance = async (skipCache = false) => {
  const cacheKey = "exchange_balance";

  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }

  if (!getToken()) return { alpaca: 0, okx: 0, total: 0 };

  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/exchanges/balance",
    });

    const data = unwrap(response);
    const result = data?.data || data || { alpaca: 0, okx: 0, total: 0 };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] Failed to load exchange balance:", error);
    return { alpaca: 0, okx: 0, total: 0 };
  }
};

/* ================= AUTH ENDPOINTS ================= */

const signup = async (userData) => {
  const isEnterprise = userData?.tier === "enterprise" || userData?.mode === "enterprise";
  
  try {
    const response = await requestWithDedupe(
      userApi,
      { method: "post", url: "/api/auth/signup", data: userData },
      { throttle: false }
    );

    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;
    const requiresApproval = data?.requires_approval || data?.data?.requires_approval || false;

    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);

    clearCache();

    return { success: true, data, token, api_key: apiKey, requiresApproval };
  } catch (error) {
    if (isEnterprise && error?.response?.status === 202) {
      return { success: true, requiresApproval: true, message: "Enterprise signup request received. Our sales team will contact you shortly." };
    }
    return handleApiError(error, "Signup failed");
  }
};

const register = signup;

const login = async (email, password) => {
  try {
    const response = await requestWithDedupe(
      userApi,
      { method: "post", url: "/api/auth/login", data: { email, password } },
      { throttle: false }
    );

    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (!token) {
      return { success: false, error: "No token received from server" };
    }

    setToken(token);
    if (apiKey) setApiKey(apiKey);

    clearCache();

    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Login failed");
  }
};

const logout = () => {
  clearToken();
  clearApiKey();
  clearCache();

  if (isBrowser) {
    window.location.href = "/login";
  }
};

const verifyAuth = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/auth/verify" });
    const data = unwrap(response);
    return { success: true, valid: !!data?.valid, user: data?.user || data?.data?.user || null };
  } catch (error) {
    return handleApiError(error, "Auth verification failed");
  }
};

const getMe = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_me");
    if (cached) return cached;
  }

  if (!getToken()) return null;

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/me" });
    const data = unwrap(response);
    const user = data?.data?.user || data?.user || data?.data || null;

    if (user) {
      const referralCount = user.total_referrals || 0;
      let nftTier = "none";
      if (referralCount >= 50) nftTier = "legendary";
      else if (referralCount >= 20) nftTier = "epic";
      else if (referralCount >= 5) nftTier = "rare";
      else if (referralCount >= 1) nftTier = "common";
      
      user.nft_tier = nftTier;
      user.is_enterprise = user.tier === "enterprise";
      user.has_enhanced_bot_controls = user.is_enterprise && user.enhanced_bot_controls === true;
      user.has_admin_panel_access = user.is_enterprise && user.admin_panel_access === true;
      
      setCached("user_me", user);
      if (user.api_key) setApiKey(user.api_key);
    }

    return user;
  } catch (error) {
    const status = error?.response?.status;

    if (status === 401 || status === 403) {
      clearToken();
      clearApiKey();
      clearCache();
      redirectToLogin();
    }

    return null;
  }
};

/* ================= ACTIVATION / BILLING / TRIAL ================= */

const getActivationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("activation_status");
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultActivationStatus();

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/me/activation-status" });
    const data = unwrap(response);
    const status = data?.data?.status || data?.status || data?.data || {};

    const result = {
      has_card_on_file: !!status?.has_card_on_file,
      billing_complete: !!status?.billing_complete,
      trading_enabled: !!status?.trading_enabled,
      paper_trading_enabled: !!status?.paper_trading_enabled,
      okx_connected: !!status?.okx_connected,
      alpaca_connected: !!status?.alpaca_connected,
      wallet_connected: !!status?.wallet_connected,
      tier: status?.tier && VALID_TIERS.includes(status.tier) ? status.tier : "starter",
      activation_complete: !!status?.activation_complete,
      tier_requirements_met: !!status?.tier_requirements_met,
      tier_required_integration: status?.tier_required_integration || "Alpaca & OKX (both)",
      enterprise_approved: !!status?.enterprise_approved,
      custom_strategy_access: !!status?.custom_strategy_access,
      admin_panel_enabled: !!status?.admin_panel_enabled,
    };

    setCached("activation_status", result);
    return result;
  } catch {
    return getDefaultActivationStatus();
  }
};

const refreshActivation = () => getActivationStatus(true);

const getTrialStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("trial_status", 15000);
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultTrialStatus();

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/me/trial-status" });
    const data = unwrap(response);
    const row = data?.data || data || {};

    const secondsRemaining = Math.max(0, Number(row?.seconds_remaining || 0));

    const result = {
      id: row?.id || null,
      trial_status: row?.trial_status || "inactive",
      trial_started_at: row?.trial_started_at || null,
      trial_ends_at: row?.trial_ends_at || null,
      paper_trading_enabled: row?.paper_trading_enabled === true,
      seconds_remaining: secondsRemaining,
      active: row?.trial_status === "trial" && row?.paper_trading_enabled === true && secondsRemaining > 0,
    };

    setCached("trial_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getTrialStatus failed:", error);
    return getDefaultTrialStatus();
  }
};

/* ================= BILLING & SUBSCRIPTION ================= */

const getCardStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("card_status");
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/billing/card-status" });
    const data = unwrap(response);
    const result = { 
      success: true, 
      has_card: !!data?.data?.has_card, 
      billing_complete: !!data?.data?.billing_complete 
    };
    setCached("card_status", result);
    return result;
  } catch {
    return { success: false, has_card: false, billing_complete: false };
  }
};

const createSetupIntent = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/billing/setup-intent",
      data: payload,
    });
    const data = unwrap(response);
    return { 
      success: true, 
      client_secret: data?.data?.client_secret, 
      setup_intent_id: data?.data?.setup_intent_id 
    };
  } catch (error) {
    return handleApiError(error, "Failed to create setup intent");
  }
};

const changePlan = async (newTierId) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/change-plan", data: { tier: newTierId } });
    const data = unwrap(response);
    
    if (data?.requires_checkout && data?.checkout_url) {
      window.location.href = data.checkout_url;
      return { success: true, redirecting: true, checkout_url: data.checkout_url };
    }
    
    clearCache("user_me");
    clearCache("activation_status");
    
    return { success: true, data: data?.data || data, message: data?.message || `Successfully changed to ${newTierId} plan` };
  } catch (error) {
    return handleApiError(error, "Failed to change plan");
  }
};

const probeBillingRoutes = async () => {
  try {
    await requestWithDedupe(userApi, { method: "head", url: "/api/billing/card-status" });
    return { success: true };
  } catch {
    return { success: false };
  }
};

/* ================= PAPER TRADING ================= */

const togglePaperTrading = async (enabled) => {
  const nextEnabled = !!enabled;

  try {
    const response = await requestWithDedupe(userApi, {
      method: "patch",
      url: "/api/user/paper-trading",
      data: { enabled: nextEnabled },
    });

    const data = unwrap(response);
    clearTradingCache();

    const paperTradingEnabled = normalizeBool(data?.data?.paper_trading_enabled ?? data?.data?.enabled, nextEnabled);

    return {
      success: true,
      enabled: paperTradingEnabled,
      paper_trading_enabled: paperTradingEnabled,
      message: data?.message || (paperTradingEnabled ? "Paper trading enabled" : "Paper trading disabled"),
    };
  } catch (error) {
    return handleApiError(error, "Failed to toggle paper trading");
  }
};

const toggleTrading = async (enabled) => {
  const nextEnabled = !!enabled;

  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/enable",
      data: { enabled: nextEnabled, confirmed: nextEnabled },
    });

    const data = unwrap(response);
    clearTradingCache();

    const tradingEnabled = normalizeBool(data?.data?.trading_enabled ?? data?.data?.enabled, nextEnabled);

    return {
      success: true,
      enabled: tradingEnabled,
      trading_enabled: tradingEnabled,
      message: data?.message || (tradingEnabled ? "Live trading enabled" : "Live trading disabled"),
    };
  } catch (error) {
    return handleApiError(error, "Failed to toggle live trading");
  }
};

const executePaperTrade = async () => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/execute",
      data: {},
    });
    const data = unwrap(response);
    return { 
      success: true, 
      trade: data?.data?.trade || data?.trade || null, 
      message: data?.message || "Paper trade executed" 
    };
  } catch (error) {
    return handleApiError(error, "Failed to execute paper trade");
  }
};

/* ================= USER TRADING ENDPOINTS ================= */

const getUserTradingStats = async (days = 30, skipCache = false) => {
  const cacheKey = `user_trading_stats_${days}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 20000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/user/trading-stats?days=${days}` });
    const data = unwrap(response);
    const result = data?.data || data || { summary: {}, daily_performance: [] };
    setCached(cacheKey, result);
    return result;
  } catch {
    return { summary: {}, daily_performance: [] };
  }
};

const getTradingStrategies = async (skipCache = false) => {
  const cacheKey = "trading_strategies";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultStrategies();

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/strategies" });
    const data = unwrap(response);
    const strategies = data?.strategies || data?.data?.strategies || [];

    const result = {
      success: true,
      strategies,
      current_strategy: data?.current_strategy || data?.data?.current_strategy || "ai_weighted",
      tier: data?.tier || data?.data?.tier || "starter",
      count: strategies.length,
    };

    setCached(cacheKey, result);
    return result;
  } catch {
    return getDefaultStrategies();
  }
};

const updateUserStrategy = async (strategyId) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "put", url: "/api/user/strategy", data: { strategy: strategyId } });
    const data = unwrap(response);
    clearTradingCache();
    return { success: true, strategy: data?.data?.strategy || data?.strategy || strategyId, message: data?.message || "Trading strategy updated" };
  } catch (error) {
    return handleApiError(error, "Failed to update strategy");
  }
};

/* ================= INTEGRATIONS ================= */

const getIntegrationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("integration_status", 20000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/integrations/status" });
    const data = unwrap(response);
    const row = data?.data || data || {};

    const result = {
      wallet_connected: !!row.wallet_connected,
      alpaca_connected: !!row.alpaca_connected,
      okx_connected: !!row.okx_connected,
      alpaca_api_key_masked: row.alpaca_api_key_masked || null,
      alpaca_mode: row.alpaca_mode || "paper",
      okx_api_key_masked: row.okx_api_key_masked || null,
      okx_mode: row.okx_mode || "paper",
      wallet_address_masked: row.wallet_address_masked || null,
    };

    setCached("integration_status", result);
    return result;
  } catch {
    return { 
      wallet_connected: false, 
      alpaca_connected: false, 
      okx_connected: false,
      alpaca_api_key_masked: null,
      okx_api_key_masked: null,
      alpaca_mode: "paper",
      okx_mode: "paper",
      wallet_address_masked: null,
    };
  }
};

const connectOKX = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/okx",
      data: payload,
    });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect OKX");
  }
};

const connectAlpaca = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/alpaca",
      data: payload,
    });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect Alpaca");
  }
};

const connectWallet = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/wallet",
      data: payload,
    });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect wallet");
  }
};

const disconnectOKX = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "delete", url: "/api/integrations/okx" });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to disconnect OKX");
  }
};

const disconnectAlpaca = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "delete", url: "/api/integrations/alpaca" });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to disconnect Alpaca");
  }
};

const switchAlpacaToLive = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/alpaca/live" });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to switch Alpaca to live mode");
  }
};

const switchOKXToLive = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/okx/live" });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to switch OKX to live mode");
  }
};

/* ================= AUTH HELPERS ================= */

const forgotPassword = async (email) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/auth/forgot-password",
      data: { email },
    });
    const data = unwrap(response);
    return { success: true, message: data?.message || "Reset link sent" };
  } catch (error) {
    return handleApiError(error, "Failed to send reset email");
  }
};

/* ================= GLOBAL / PUBLIC ================= */

const getGlobalTrades = async (options = {}) => {
  const { limit = 20, skipCache = false } = options;
  const cacheKey = `global_trades_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/trading/global-trades?limit=${limit}` });
    const data = unwrap(response);
    const result = { success: true, trades: data?.trades || data?.data?.trades || [], count: (data?.trades || data?.data?.trades || []).length };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], count: 0, error: getErrorMessage(error, "Failed to load global trades") };
  }
};

/* ================= CLASS EXPORT ================= */

class BotAPIClass {
  constructor() {
    this.api = userApi;
    this.sniperApi = sniperApi;
    this.publicApi = publicApi;
    this.request = request;
  }

  // Storage/session
  setToken = setToken;
  getToken = getToken;
  clearToken = clearToken;
  setApiKey = setApiKey;
  getApiKey = getApiKey;
  clearApiKey = clearApiKey;
  isAuthenticated = isAuthenticated;
  clearCache = clearCache;

  // Auth
  signup = signup;
  register = register;
  login = login;
  logout = logout;
  verifyAuth = verifyAuth;
  getMe = getMe;

  // Activation/billing/trial
  getActivationStatus = getActivationStatus;
  activationStatus = getActivationStatus;
  refreshActivation = refreshActivation;
  getTrialStatus = getTrialStatus;

  // Billing & Subscription
  getCardStatus = getCardStatus;
  createSetupIntent = createSetupIntent;
  changePlan = changePlan;
  probeBillingRoutes = probeBillingRoutes;

  // Live Trading
  getLiveTradingStats = getLiveTradingStats;
  getExchangeBalance = getExchangeBalance;

  // Trading
  getUserTradingStats = getUserTradingStats;
  getTradingStrategies = getTradingStrategies;
  updateUserStrategy = updateUserStrategy;
  toggleTrading = toggleTrading;
  togglePaperTrading = togglePaperTrading;
  executePaperTrade = executePaperTrade;
  
  // Integrations
  connectOKX = connectOKX;
  connectAlpaca = connectAlpaca;
  connectWallet = connectWallet;
  disconnectOKX = disconnectOKX;
  disconnectAlpaca = disconnectAlpaca;
  switchAlpacaToLive = switchAlpacaToLive;
  switchOKXToLive = switchOKXToLive;
  getIntegrationStatus = getIntegrationStatus;

  // Auth helpers
  forgotPassword = forgotPassword;

  // Public/global
  getGlobalTrades = getGlobalTrades;
}

// Create the BotAPI instance
const BotAPI = new BotAPIClass();

export default BotAPI;
