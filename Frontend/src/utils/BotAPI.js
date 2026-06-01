// src/utils/BotAPI.js - IMALI PRODUCTION VERSION
import axios from "axios";

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");
const USER_API_BASE = (process.env.REACT_APP_USER_API_BASE_URL || API_BASE).replace(/\/+$/, "");
const SNIPER_API_BASE = (process.env.REACT_APP_SNIPER_API_BASE_URL || API_BASE).replace(/\/+$/, "");

const TOKEN_KEY = "imali_token";
const API_KEY_KEY = "imali_api_key";
const isBrowser = typeof window !== "undefined";

const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 900,
  cacheTTL: 60000,
  rateLimitCooldown: 600,
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

const VALID_TIERS = [
  "starter",
  "pro",
  "elite",
  "rare",
  "epic",
  "legendary",
  "common",
  "stock",
  "bundle",
  "enterprise",
];

const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp < ttl) return cached.data;
  cache.delete(key);
  return null;
};

const setCached = (key, data) => cache.set(key, { data, timestamp: Date.now() });

const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (String(key).includes(pattern)) cache.delete(key);
  }
};

const clearTradingCache = () => {
  [
    "activation_status",
    "trial_status",
    "integration_status",
    "user_me",
    "user_trading_stats",
    "user_positions",
    "user_trades",
    "user_bot_executions",
    "trading_strategies",
    "live_trading_stats",
    "exchange_balance",
    "live_trade_history",
    "card_status",
  ].forEach(clearCache);
};

export const getToken = () => {
  if (!isBrowser) return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setToken = (token) => {
  if (!isBrowser) return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (err) { console.error("[BotAPI] Failed to save token:", err); }
};

export const clearToken = () => {
  if (!isBrowser) return;
  try { localStorage.removeItem(TOKEN_KEY); } catch (err) { console.error("[BotAPI] Failed to clear token:", err); }
};

export const getApiKey = () => {
  if (!isBrowser) return null;
  try { return localStorage.getItem(API_KEY_KEY); } catch { return null; }
};

export const setApiKey = (apiKey) => {
  if (!isBrowser) return;
  try {
    if (apiKey) localStorage.setItem(API_KEY_KEY, apiKey);
    else localStorage.removeItem(API_KEY_KEY);
  } catch (err) { console.error("[BotAPI] Failed to save API key:", err); }
};

export const clearApiKey = () => {
  if (!isBrowser) return;
  try { localStorage.removeItem(API_KEY_KEY); } catch (err) { console.error("[BotAPI] Failed to clear API key:", err); }
};

export const isAuthenticated = () => !!getToken();

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

const shouldForceLogout = (url = "") => SESSION_CHECK_ENDPOINTS.some((endpoint) => String(url).includes(endpoint));

const redirectToLogin = () => {
  if (!isBrowser) return;
  const path = window.location.pathname;
  if (!path.includes("/login") && !path.includes("/signup")) window.location.href = "/login?expired=true";
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
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  return fallback;
};

const normalizeMode = (value, fallback = "paper") => {
  const mode = String(value || fallback || "paper").toLowerCase();
  return mode === "live" ? "live" : "paper";
};

const parseMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (value && typeof value === "object") {
    return parseMoney(value.total ?? value.balance ?? value.equity ?? value.available ?? value.cash ?? value.usd ?? 0);
  }
  return 0;
};

const makeRequestKey = (method, url, data) => `${String(method || "get").toUpperCase()} ${url} ${data ? JSON.stringify(data) : ""}`;

const throttleRequest = async (key) => {
  const last = lastRequestAt.get(key) || 0;
  const elapsed = Date.now() - last;
  if (elapsed < API_CONFIG.rateLimitCooldown) await wait(API_CONFIG.rateLimitCooldown - elapsed);
  lastRequestAt.set(key, Date.now());
};

const requestWithDedupe = async (client, config, options = {}) => {
  const method = String(config.method || "get").toLowerCase();
  const url = config.url || "";
  const data = config.data || null;
  const key = makeRequestKey(method, url, data);

  if (options.throttle !== false) await throttleRequest(key);
  if (method === "get" && inflight.has(key)) return inflight.get(key);

  const promise = client(config).finally(() => inflight.delete(key));
  if (method === "get") inflight.set(key, promise);
  return promise;
};

const createApiClient = (baseURL) => axios.create({
  baseURL,
  timeout: API_CONFIG.timeout,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
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

export const request = async (url, options = {}) => {
  const method = String(options.method || "GET").toLowerCase();
  const body = options.body ? JSON.parse(options.body) : options.data;
  try {
    const response = await requestWithDedupe(userApi, { url, method, data: body, params: options.params });
    return unwrap(response);
  } catch (error) {
    throw { ...error, message: getErrorMessage(error, "Request failed"), status: error?.response?.status };
  }
};

const getDefaultActivationStatus = () => ({
  has_card_on_file: false,
  billing_complete: false,
  trading_enabled: false,
  paper_trading_enabled: false,
  okx_connected: false,
  okx_mode: "paper",
  alpaca_connected: false,
  alpaca_mode: "paper",
  wallet_connected: false,
  tier: "starter",
  activation_complete: false,
  tier_requirements_met: false,
  tier_required_integration: "Connect OKX or Alpaca for live trading",
});

const getDefaultTrialStatus = () => ({ trial_status: "inactive", paper_trading_enabled: false, seconds_remaining: 0, active: false });

const getDefaultStrategies = () => ({
  success: true,
  strategies: [
    { id: "mean_reversion", name: "Mean Reversion", risk_level: "low", min_tier: "starter" },
    { id: "ai_weighted", name: "AI Weighted", risk_level: "medium", min_tier: "starter" },
    { id: "momentum", name: "Momentum", risk_level: "medium", min_tier: "starter" },
    { id: "aggressive", name: "Aggressive", risk_level: "high", min_tier: "pro" },
  ],
  current_strategy: "ai_weighted",
  tier: "starter",
  _fallback: true,
});

const getDefaultLiveStats = () => ({ summary: { total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_balance: 0 }, daily_performance: [], recent_trades: [] });

const normalizeIntegrationStatus = (row = {}) => ({
  wallet_connected: normalizeBool(row.wallet_connected, false),
  alpaca_connected: normalizeBool(row.alpaca_connected, false),
  okx_connected: normalizeBool(row.okx_connected, false),
  alpaca_api_key_masked: row.alpaca_api_key_masked || row.alpaca_key_masked || null,
  okx_api_key_masked: row.okx_api_key_masked || row.okx_key_masked || null,
  alpaca_mode: normalizeMode(row.alpaca_mode || row.alpaca_account_mode || row.alpaca_environment, "paper"),
  okx_mode: normalizeMode(row.okx_mode || row.okx_account_mode || row.okx_environment, "paper"),
  wallet_address_masked: row.wallet_address_masked || row.wallet_masked || null,
});

const getLiveTradingStats = async (skipCache = false) => {
  const cacheKey = "live_trading_stats";
  if (!skipCache) {
    const cached = getCached(cacheKey, 20000);
    if (cached) return cached;
  }
  if (!getToken()) return getDefaultLiveStats();
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/live-stats" });
    const data = unwrap(response);
    const result = data?.data || data || getDefaultLiveStats();
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] Failed to load live trading stats:", error);
    return getDefaultLiveStats();
  }
};

const getLiveTradeHistory = async (limit = 20, skipCache = false) => {
  const cacheKey = `live_trade_history_${limit}`;
  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }
  if (!getToken()) return { success: true, trades: [] };
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/trading/live-trades?limit=${limit}` });
    const data = unwrap(response);
    const trades = data?.data?.trades || data?.trades || data?.data || [];
    const result = { success: true, trades: Array.isArray(trades) ? trades : [] };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], error: getErrorMessage(error, "Failed to load live trades") };
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
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/exchanges/balance" });
    const data = unwrap(response);
    const row = data?.data || data || {};
    const okx = parseMoney(row.okx ?? row.okx_balance ?? row.crypto ?? row.okx_total);
    const alpaca = parseMoney(row.alpaca ?? row.alpaca_balance ?? row.stocks ?? row.alpaca_total);
    const total = parseMoney(row.total ?? row.total_balance) || okx + alpaca;
    const result = { success: true, okx, alpaca, total };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] Failed to load exchange balance:", error);
    return { success: false, alpaca: 0, okx: 0, total: 0, error: getErrorMessage(error, "Failed to load exchange balance") };
  }
};

const signup = async (userData) => {
  const isEnterprise = userData?.tier === "enterprise" || userData?.mode === "enterprise";
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/auth/signup", data: userData }, { throttle: false });
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;
    const requiresApproval = data?.requires_approval || data?.data?.requires_approval || false;
    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);
    clearCache();
    return { success: true, data, token, api_key: apiKey, requiresApproval };
  } catch (error) {
    if (isEnterprise && error?.response?.status === 202) return { success: true, requiresApproval: true, message: "Enterprise signup request received." };
    return handleApiError(error, "Signup failed");
  }
};

const register = signup;

const login = async (email, password) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/auth/login", data: { email, password } }, { throttle: false });
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

const logout = () => { clearToken(); clearApiKey(); clearCache(); if (isBrowser) window.location.href = "/login"; };

const verifyAuth = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/auth/verify" });
    const data = unwrap(response);
    return { success: true, valid: !!data?.valid, user: data?.user || data?.data?.user || null };
  } catch (error) { return handleApiError(error, "Auth verification failed"); }
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
      setCached("user_me", user);
      if (user.api_key) setApiKey(user.api_key);
    }
    return user;
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) { clearToken(); clearApiKey(); clearCache(); redirectToLogin(); }
    return null;
  }
};

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
    const integrations = normalizeIntegrationStatus(status);
    const result = {
      has_card_on_file: normalizeBool(status.has_card_on_file),
      billing_complete: normalizeBool(status.billing_complete),
      trading_enabled: normalizeBool(status.trading_enabled),
      paper_trading_enabled: normalizeBool(status.paper_trading_enabled),
      ...integrations,
      tier: status?.tier && VALID_TIERS.includes(String(status.tier).toLowerCase()) ? String(status.tier).toLowerCase() : "starter",
      activation_complete: normalizeBool(status.activation_complete),
      tier_requirements_met: normalizeBool(status.tier_requirements_met),
      tier_required_integration: status.tier_required_integration || "Connect OKX or Alpaca for live trading",
      enterprise_approved: normalizeBool(status.enterprise_approved),
      custom_strategy_access: normalizeBool(status.custom_strategy_access),
      admin_panel_enabled: normalizeBool(status.admin_panel_enabled),
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
    const result = { ...row, seconds_remaining: secondsRemaining, active: ["trial", "active"].includes(row.trial_status) && secondsRemaining > 0 };
    setCached("trial_status", result);
    return result;
  } catch { return getDefaultTrialStatus(); }
};

const getCardStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("card_status");
    if (cached) return cached;
  }
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/billing/card-status" });
    const data = unwrap(response);
    const row = data?.data || data || {};
    const result = { success: true, has_card: normalizeBool(row.has_card ?? row.has_card_on_file), billing_complete: normalizeBool(row.billing_complete) };
    setCached("card_status", result);
    return result;
  } catch { return { success: false, has_card: false, billing_complete: false }; }
};

const createSetupIntent = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/setup-intent", data: payload });
    const data = unwrap(response);
    return { success: true, client_secret: data?.data?.client_secret || data?.client_secret, setup_intent_id: data?.data?.setup_intent_id || data?.setup_intent_id };
  } catch (error) { return handleApiError(error, "Failed to create setup intent"); }
};

const changePlan = async (newTierId) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/change-plan", data: { tier: newTierId } });
    const data = unwrap(response);
    if (data?.requires_checkout && data?.checkout_url) {
      window.location.href = data.checkout_url;
      return { success: true, redirecting: true, checkout_url: data.checkout_url };
    }
    clearTradingCache();
    return { success: true, data: data?.data || data, message: data?.message || `Successfully changed to ${newTierId} plan` };
  } catch (error) { return handleApiError(error, "Failed to change plan"); }
};

const probeBillingRoutes = async () => {
  try { await requestWithDedupe(userApi, { method: "head", url: "/api/billing/card-status" }); return { success: true }; }
  catch { return { success: false }; }
};

const togglePaperTrading = async (enabled) => {
  const nextEnabled = !!enabled;
  try {
    const response = await requestWithDedupe(userApi, { method: "patch", url: "/api/user/paper-trading", data: { enabled: nextEnabled } });
    const data = unwrap(response);
    clearTradingCache();
    const paperTradingEnabled = normalizeBool(data?.data?.paper_trading_enabled ?? data?.data?.enabled, nextEnabled);
    return { success: true, enabled: paperTradingEnabled, paper_trading_enabled: paperTradingEnabled, message: data?.message || (paperTradingEnabled ? "Paper trading enabled" : "Paper trading disabled") };
  } catch (error) { return handleApiError(error, "Failed to toggle paper trading"); }
};

const toggleTrading = async (enabled) => {
  const nextEnabled = !!enabled;
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/enable", data: { enabled: nextEnabled, confirmed: nextEnabled } });
    const data = unwrap(response);
    clearTradingCache();
    const tradingEnabled = normalizeBool(data?.data?.trading_enabled ?? data?.data?.enabled, nextEnabled);
    return { success: true, enabled: tradingEnabled, trading_enabled: tradingEnabled, message: data?.message || (tradingEnabled ? "Live trading enabled" : "Live trading disabled") };
  } catch (error) { return handleApiError(error, "Failed to toggle live trading"); }
};

const executePaperTrade = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/paper/execute", data: {} });
    const data = unwrap(response);
    return { success: true, trade: data?.data?.trade || data?.trade || null, message: data?.message || "Paper trade executed" };
  } catch (error) { return handleApiError(error, "Failed to execute paper trade"); }
};

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
  } catch { return { summary: {}, daily_performance: [] }; }
};

const getTradingStrategies = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("trading_strategies", 30000);
    if (cached) return cached;
  }
  if (!getToken()) return getDefaultStrategies();
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/strategies" });
    const data = unwrap(response);
    const strategies = data?.strategies || data?.data?.strategies || [];
    const result = { success: true, strategies, current_strategy: data?.current_strategy || data?.data?.current_strategy || "ai_weighted", tier: data?.tier || data?.data?.tier || "starter", count: strategies.length };
    setCached("trading_strategies", result);
    return result;
  } catch { return getDefaultStrategies(); }
};

const updateUserStrategy = async (strategyId) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "put", url: "/api/user/strategy", data: { strategy: strategyId } });
    const data = unwrap(response);
    clearTradingCache();
    return { success: true, strategy: data?.data?.strategy || data?.strategy || strategyId, message: data?.message || "Trading strategy updated" };
  } catch (error) { return handleApiError(error, "Failed to update strategy"); }
};

const getIntegrationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("integration_status", 20000);
    if (cached) return cached;
  }
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/integrations/status" });
    const data = unwrap(response);
    const row = data?.data || data || {};
    const result = normalizeIntegrationStatus(row);
    setCached("integration_status", result);
    return result;
  } catch { return normalizeIntegrationStatus({}); }
};

const connectOKX = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/okx", data: { ...payload, mode: normalizeMode(payload?.mode) } });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) { return handleApiError(error, "Failed to connect OKX"); }
};

const connectAlpaca = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/alpaca", data: { ...payload, mode: normalizeMode(payload?.mode) } });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) { return handleApiError(error, "Failed to connect Alpaca"); }
};

const connectWallet = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/wallet", data: payload });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) { return handleApiError(error, "Failed to connect wallet"); }
};

const disconnectOKX = async () => {
  try { const response = await requestWithDedupe(userApi, { method: "delete", url: "/api/integrations/okx" }); clearTradingCache(); return { success: true, data: unwrap(response) }; }
  catch (error) { return handleApiError(error, "Failed to disconnect OKX"); }
};

const disconnectAlpaca = async () => {
  try { const response = await requestWithDedupe(userApi, { method: "delete", url: "/api/integrations/alpaca" }); clearTradingCache(); return { success: true, data: unwrap(response) }; }
  catch (error) { return handleApiError(error, "Failed to disconnect Alpaca"); }
};

const switchExchangeMode = async (exchange, mode) => {
  const normalizedExchange = String(exchange || "").toLowerCase();
  const normalizedMode = normalizeMode(mode);
  const endpoint = `/api/integrations/${normalizedExchange}/${normalizedMode}`;
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: endpoint });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (primaryError) {
    try {
      const response = await requestWithDedupe(userApi, { method: "patch", url: `/api/integrations/${normalizedExchange}/mode`, data: { mode: normalizedMode } });
      clearTradingCache();
      return { success: true, data: unwrap(response) };
    } catch {
      return handleApiError(primaryError, `Failed to switch ${normalizedExchange} to ${normalizedMode} mode`);
    }
  }
};

const switchAlpacaToLive = () => switchExchangeMode("alpaca", "live");
const switchOKXToLive = () => switchExchangeMode("okx", "live");
const switchAlpacaToPaper = () => switchExchangeMode("alpaca", "paper");
const switchOKXToPaper = () => switchExchangeMode("okx", "paper");

const forgotPassword = async (email) => {
  try { const response = await requestWithDedupe(userApi, { method: "post", url: "/api/auth/forgot-password", data: { email } }); const data = unwrap(response); return { success: true, message: data?.message || "Reset link sent" }; }
  catch (error) { return handleApiError(error, "Failed to send reset email"); }
};

const getImaliBalance = async () => {
  try { const response = await requestWithDedupe(userApi, { method: "get", url: "/api/wallet/imali-balance" }); const data = unwrap(response); return { success: true, balance: parseMoney(data?.data?.balance ?? data?.balance ?? data?.data ?? 0) }; }
  catch { return { success: false, balance: 0 }; }
};

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
    const trades = data?.trades || data?.data?.trades || [];
    const result = { success: true, trades, count: trades.length };
    setCached(cacheKey, result);
    return result;
  } catch (error) { return { success: false, trades: [], count: 0, error: getErrorMessage(error, "Failed to load global trades") }; }
};

class BotAPIClass {
  constructor() { this.api = userApi; this.sniperApi = sniperApi; this.publicApi = publicApi; this.request = request; }
  setToken = setToken; getToken = getToken; clearToken = clearToken; setApiKey = setApiKey; getApiKey = getApiKey; clearApiKey = clearApiKey; isAuthenticated = isAuthenticated; clearCache = clearCache; clearTradingCache = clearTradingCache;
  signup = signup; register = register; login = login; logout = logout; verifyAuth = verifyAuth; getMe = getMe; forgotPassword = forgotPassword;
  getActivationStatus = getActivationStatus; activationStatus = getActivationStatus; refreshActivation = refreshActivation; getTrialStatus = getTrialStatus;
  getCardStatus = getCardStatus; createSetupIntent = createSetupIntent; changePlan = changePlan; probeBillingRoutes = probeBillingRoutes;
  getLiveTradingStats = getLiveTradingStats; getExchangeBalance = getExchangeBalance; getLiveTradeHistory = getLiveTradeHistory;
  getUserTradingStats = getUserTradingStats; getTradingStrategies = getTradingStrategies; updateUserStrategy = updateUserStrategy; toggleTrading = toggleTrading; togglePaperTrading = togglePaperTrading; executePaperTrade = executePaperTrade;
  connectOKX = connectOKX; connectAlpaca = connectAlpaca; connectWallet = connectWallet; disconnectOKX = disconnectOKX; disconnectAlpaca = disconnectAlpaca; switchAlpacaToLive = switchAlpacaToLive; switchOKXToLive = switchOKXToLive; switchAlpacaToPaper = switchAlpacaToPaper; switchOKXToPaper = switchOKXToPaper; switchExchangeMode = switchExchangeMode; getIntegrationStatus = getIntegrationStatus;
  getImaliBalance = getImaliBalance; getGlobalTrades = getGlobalTrades;
}

const BotAPI = new BotAPIClass();
export default BotAPI;
