// src/utils/BotAPI.js
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
  retryDelay: 1000,
  cacheTTL: 60000,
};

const SESSION_CHECK_ENDPOINTS = [
  "/api/me",
  "/api/auth/verify",
  "/api/me/activation-status",
  "/api/me/trial-status",
];

const cache = new Map();

/* ================= CACHE HELPERS ================= */
const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp < ttl) return cached.data;
  cache.delete(key);
  return null;
};

const setCached = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (String(key).includes(pattern)) cache.delete(key);
  }
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

/* ================= RESPONSE HELPERS ================= */
const unwrap = (response) => response?.data ?? response;

const getErrorMessage = (error, fallbackMessage = "Request failed") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallbackMessage;

const handleApiError = (error, fallbackMessage) => ({
  success: false,
  error: getErrorMessage(error, fallbackMessage),
  status: error?.response?.status,
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

      if (!error?.response && config && (config.__retryCount || 0) < API_CONFIG.retryAttempts) {
        config.__retryCount = (config.__retryCount || 0) + 1;
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.retryDelay * config.__retryCount)
        );
        return apiClient(config);
      }

      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(userApi);
addAuthInterceptor(sniperApi);

/* ================= DEFAULTS ================= */
const getDefaultActivationStatus = () => ({
  has_card_on_file: false,
  billing_complete: false,
  trading_enabled: false,
  okx_connected: false,
  alpaca_connected: false,
  wallet_connected: false,
  tier: "starter",
  activation_complete: false,
  tier_requirements_met: false,
  tier_required_integration: "Alpaca & OKX (both)",
});

const getDefaultStrategies = () => ({
  success: true,
  strategies: [
    {
      id: "mean_reversion",
      name: "Mean Reversion",
      backend_name: "Mean Reversion",
      description: "Looks for dips and safe rebounds. Lower risk, steady moves.",
      risk_level: "low",
      is_default: false,
    },
    {
      id: "ai_weighted",
      name: "AI Weighted",
      backend_name: "AI Weighted",
      description: "Smart mix of signals — balanced risk and reward.",
      risk_level: "medium",
      is_default: true,
    },
    {
      id: "momentum",
      name: "Momentum",
      backend_name: "Momentum",
      description: "Follows strong trends for bigger moves. Higher risk.",
      risk_level: "high",
      is_default: false,
    },
    {
      id: "arbitrage",
      name: "Arbitrage",
      backend_name: "Arbitrage",
      description: "Profits from price differences across venues. Low risk.",
      risk_level: "low",
      is_default: false,
    },
  ],
  current_strategy: "ai_weighted",
  tier: "starter",
  count: 4,
  _fallback: true,
});

/* ================= AUTH ENDPOINTS ================= */
export const signup = async (userData) => {
  try {
    const response = await userApi.post("/api/auth/signup", userData);
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);

    clearCache();
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
};

export const register = signup;

export const login = async (email, password) => {
  try {
    const response = await userApi.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (!token) return { success: false, error: "No token received from server" };

    setToken(token);
    if (apiKey) setApiKey(apiKey);

    clearCache();
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

export const verifyAuth = async () => {
  try {
    const response = await userApi.post("/api/auth/verify");
    const data = unwrap(response);
    return { success: true, valid: !!data?.valid, user: data?.user || null };
  } catch (error) {
    return handleApiError(error, "Auth verification failed");
  }
};

export const getMe = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_me");
    if (cached) return cached;
  }

  if (!getToken()) return null;

  try {
    const response = await userApi.get("/api/me");
    const data = unwrap(response);
    const user = data?.data?.user || data?.user || data?.data || null;

    if (user) {
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
export const getActivationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("activation_status");
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultActivationStatus();

  try {
    const response = await userApi.get("/api/me/activation-status");
    const data = unwrap(response);
    const status = data?.data?.status || data?.status || {};

    const result = {
      has_card_on_file: !!status?.has_card_on_file,
      billing_complete: !!status?.billing_complete,
      trading_enabled: !!status?.trading_enabled,
      okx_connected: !!status?.okx_connected,
      alpaca_connected: !!status?.alpaca_connected,
      wallet_connected: !!status?.wallet_connected,
      tier: status?.tier || "starter",
      activation_complete: !!status?.activation_complete,
      tier_requirements_met: !!status?.tier_requirements_met,
      tier_required_integration: status?.tier_required_integration || "Alpaca & OKX (both)",
    };

    setCached("activation_status", result);
    return result;
  } catch (error) {
    return getDefaultActivationStatus();
  }
};

export const refreshActivation = () => getActivationStatus(true);

export const getTrialStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("trial_status", 15000);
    if (cached) return cached;
  }

  if (!getToken()) {
    return {
      trial_status: "inactive",
      paper_trading_enabled: false,
      seconds_remaining: 0,
      error: "Not authenticated",
    };
  }

  try {
    const response = await userApi.get("/api/me/trial-status");
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
      active:
        row?.trial_status === "trial" &&
        row?.paper_trading_enabled === true &&
        secondsRemaining > 0,
    };

    setCached("trial_status", result);
    return result;
  } catch (error) {
    return {
      trial_status: "inactive",
      paper_trading_enabled: false,
      seconds_remaining: 0,
      active: false,
      error: getErrorMessage(error, "Failed to load trial status"),
    };
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
      has_card: !!data?.data?.has_card,
      billing_complete: !!data?.data?.billing_complete,
    };
    setCached("card_status", result);
    return result;
  } catch (error) {
    return { success: false, has_card: false, billing_complete: false };
  }
};

export const createSetupIntent = async (payload) => {
  try {
    const response = await userApi.post("/api/billing/setup-intent", payload);
    const data = unwrap(response);
    return {
      success: true,
      client_secret: data?.data?.client_secret,
      setup_intent_id: data?.data?.setup_intent_id,
    };
  } catch (error) {
    return handleApiError(error, "Failed to create setup intent");
  }
};

export const confirmCard = async (payload = {}) => {
  try {
    const response = await userApi.post("/api/billing/confirm-card", payload);
    clearCache("activation_status");
    clearCache("card_status");
    return {
      success: true,
      confirmed: unwrap(response)?.data?.confirmed || true,
    };
  } catch (error) {
    return handleApiError(error, "Failed to confirm card");
  }
};

/* ================= TRADING ENDPOINTS ================= */
export const getUserTrades = async (options = {}) => {
  const { limit = 100, status, bot, skipCache = false } = options;
  const cacheKey = `user_trades_${limit}_${status || "all"}_${bot || "all"}`;

  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.set("status", status);
  if (bot) params.set("bot", bot);

  try {
    const response = await userApi.get(`/api/user/trades?${params.toString()}`);
    const data = unwrap(response);
    const result = {
      success: true,
      trades: data?.data?.trades || [],
      summary: data?.data?.summary || {},
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      trades: [],
      summary: {},
      error: getErrorMessage(error, "Failed to load trades"),
    };
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
      count: data?.data?.count || 0,
    };
    setCached("user_positions", result);
    return result;
  } catch (error) {
    return {
      success: false,
      positions: [],
      count: 0,
      error: getErrorMessage(error, "Failed to load positions"),
    };
  }
};

export const cancelPosition = async (positionId) => {
  try {
    const response = await userApi.delete(`/api/trading/positions/${positionId}`);
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return { success: true, message: data?.message || "Position cancelled successfully" };
  } catch (error) {
    return handleApiError(error, "Failed to cancel position");
  }
};

export const cancelAllPositions = async () => {
  try {
    const response = await userApi.post("/api/trading/positions/cancel-all");
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return { success: true, message: data?.message || "All positions cancelled successfully" };
  } catch (error) {
    return handleApiError(error, "Failed to cancel positions");
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
      count: data?.data?.count || 0,
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, executions: [], count: 0 };
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
    return { summary: {}, daily_performance: [] };
  }
};

export const getTradingStrategies = async (skipCache = false) => {
  const cacheKey = "trading_strategies";
  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultStrategies();

  try {
    const response = await userApi.get("/api/trading/strategies");
    const data = unwrap(response);
    const result = {
      success: true,
      strategies: data?.strategies || data?.data?.strategies || [],
      current_strategy: data?.current_strategy || data?.data?.current_strategy || "ai_weighted",
      tier: data?.tier || data?.data?.tier || "starter",
      count: (data?.strategies || data?.data?.strategies || []).length,
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return getDefaultStrategies();
  }
};

export const updateUserStrategy = async (strategyId) => {
  try {
    const response = await userApi.put("/api/user/strategy", { strategy: strategyId });
    const data = unwrap(response);

    clearCache("trading_strategies");
    clearCache("user_me");
    clearCache("user_positions");
    clearCache("user_bot_executions");
    clearCache("user_trading_stats");

    return {
      success: true,
      strategy: data?.data?.strategy || strategyId,
      strategy_name: data?.data?.strategy_name || strategyId,
      tier: data?.data?.tier || null,
      allowed_strategies: data?.data?.allowed_strategies || [],
      message: data?.message || "Trading strategy updated",
    };
  } catch (error) {
    try {
      const response = await userApi.post("/api/trading/strategies/update", { strategy_id: strategyId });
      const data = unwrap(response);
      clearCache("trading_strategies");
      clearCache("user_me");
      return { success: true, strategy: strategyId, message: data?.message || "Trading strategy updated" };
    } catch {
      return handleApiError(error, "Failed to update strategy");
    }
  }
};

export const toggleTrading = async (enabled) => {
  try {
    const response = await userApi.post("/api/trading/enable", { enabled });
    clearCache("activation_status");
    clearCache("trial_status");
    return {
      success: true,
      enabled: unwrap(response)?.data?.enabled ?? enabled,
    };
  } catch (error) {
    return handleApiError(error, "Failed to toggle trading");
  }
};

/* ================= INTEGRATIONS ================= */
export const connectOKX = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/okx", payload);
    clearCache("activation_status");
    clearCache("integration_status");
    clearCache("user_me");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect OKX");
  }
};

export const connectAlpaca = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/alpaca", payload);
    clearCache("activation_status");
    clearCache("integration_status");
    clearCache("user_me");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect Alpaca");
  }
};

export const connectWallet = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/wallet", payload);
    clearCache("activation_status");
    clearCache("integration_status");
    clearCache("user_me");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect wallet");
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
    const result = data?.data || {
      wallet_connected: false,
      alpaca_connected: false,
      okx_connected: false,
    };
    setCached("integration_status", result);
    return result;
  } catch {
    return {
      wallet_connected: false,
      alpaca_connected: false,
      okx_connected: false,
    };
  }
};

/* ================= GLOBAL / PUBLIC ================= */
export const getGlobalTrades = async (options = {}) => {
  const { limit = 20, skipCache = false } = options;
  const cacheKey = `global_trades_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }

  if (!getToken()) return { success: false, trades: [], count: 0, error: "Not authenticated" };

  try {
    const response = await userApi.get(`/api/trading/global-trades?limit=${limit}`);
    const data = unwrap(response);
    const trades = data?.trades || data?.data?.trades || [];
    const result = { success: true, trades, count: trades.length };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      trades: [],
      count: 0,
      error: getErrorMessage(error, "Failed to load global trades"),
      status: error?.response?.status,
    };
  }
};

export const getPublicDashboardHistorical = async (days = 30) => {
  try {
    const response = await publicApi.get(`/api/public/dashboard/historical?days=${days}`);
    return unwrap(response);
  } catch (error) {
    return handleApiError(error, "Failed to load public dashboard data");
  }
};

/* ================= NEWSLETTER ================= */
export const subscribeNewsletter = async ({ email, first_name, interest }) => {
  try {
    const response = await userApi.post("/api/newsletter/subscribe", {
      email,
      first_name,
      interest,
    });
    return unwrap(response);
  } catch (error) {
    return handleApiError(error, "Newsletter signup failed");
  }
};

/* ================= CLASS EXPORT ================= */
class BotAPIClass {
  constructor() {
    this.api = userApi;
    this.sniperApi = sniperApi;
    this.publicApi = publicApi;
  }

  // Storage/session
  setToken(token) { return setToken(token); }
  getToken() { return getToken(); }
  clearToken() { return clearToken(); }
  setApiKey(apiKey) { return setApiKey(apiKey); }
  getApiKey() { return getApiKey(); }
  clearApiKey() { return clearApiKey(); }
  isAuthenticated() { return isAuthenticated(); }
  clearCache(pattern) { return clearCache(pattern); }

  // Auth
  signup(userData) { return signup(userData); }
  register(userData) { return register(userData); }
  login(email, password) { return login(email, password); }
  logout() { return logout(); }
  verifyAuth() { return verifyAuth(); }
  getMe(skipCache) { return getMe(skipCache); }

  // Activation/billing/trial
  getActivationStatus(skipCache) { return getActivationStatus(skipCache); }
  activationStatus(skipCache) { return getActivationStatus(skipCache); }
  refreshActivation() { return refreshActivation(); }
  getTrialStatus(skipCache) { return getTrialStatus(skipCache); }
  getCardStatus(skipCache) { return getCardStatus(skipCache); }
  createSetupIntent(payload) { return createSetupIntent(payload); }
  confirmCard(payload) { return confirmCard(payload); }

  // Trading
  getUserTrades(options) { return getUserTrades(options); }
  getUserPositions(skipCache) { return getUserPositions(skipCache); }
  cancelPosition(positionId) { return cancelPosition(positionId); }
  cancelAllPositions() { return cancelAllPositions(); }
  getUserBotExecutions(limit, skipCache) { return getUserBotExecutions(limit, skipCache); }
  getUserTradingStats(days, skipCache) { return getUserTradingStats(days, skipCache); }
  getTradingStrategies(skipCache) { return getTradingStrategies(skipCache); }
  updateUserStrategy(strategy) { return updateUserStrategy(strategy); }
  toggleTrading(enabled) { return toggleTrading(enabled); }

  // Integrations
  connectOKX(payload) { return connectOKX(payload); }
  connectAlpaca(payload) { return connectAlpaca(payload); }
  connectWallet(payload) { return connectWallet(payload); }
  getIntegrationStatus(skipCache) { return getIntegrationStatus(skipCache); }

  // Public/global
  getGlobalTrades(options) { return getGlobalTrades(options); }
  getPublicDashboardHistorical(days) { return getPublicDashboardHistorical(days); }

  // Newsletter
  subscribeNewsletter(payload) { return subscribeNewsletter(payload); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;
