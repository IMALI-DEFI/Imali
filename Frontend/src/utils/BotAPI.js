// src/utils/BotAPI.js - Unified exchange-agnostic API layer
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

const cache = new Map();
const inflight = new Map();
const lastRequestAt = new Map();

const VALID_TIERS = [
  "starter", "pro", "elite", "rare", "epic", "legendary", "common", "stock", "bundle", "enterprise",
];

// ── caching helpers ─────────────────────────────────────────
const getCached = (key, ttl = API_CONFIG.cacheTTL) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp < ttl) return cached.data;
  cache.delete(key);
  return null;
};
const setCached = (key, data) => cache.set(key, { data, timestamp: Date.now() });
const clearCache = (pattern) => {
  if (!pattern) { cache.clear(); return; }
  for (const key of cache.keys()) if (String(key).includes(pattern)) cache.delete(key);
};
const clearTradingCache = () =>
  ["activation_status", "trial_status", "integration_status", "user_me", "user_trading_stats", "user_positions", "user_trades", "user_bot_executions", "trading_strategies", "live_trading_stats", "exchange_balance", "live_trade_history", "card_status", "trading_bot_status"].forEach(clearCache);

// ── token / key management ──────────────────────────────────
export const getToken = () => { try { return isBrowser ? localStorage.getItem(TOKEN_KEY) : null; } catch { return null; } };
export const setToken = (token) => { if (!isBrowser) return; try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch {} };
export const clearToken = () => { if (isBrowser) try { localStorage.removeItem(TOKEN_KEY); } catch {} };
export const getApiKey = () => { try { return isBrowser ? localStorage.getItem(API_KEY_KEY) : null; } catch { return null; } };
export const setApiKey = (key) => { if (!isBrowser) return; try { key ? localStorage.setItem(API_KEY_KEY, key) : localStorage.removeItem(API_KEY_KEY); } catch {} };
export const clearApiKey = () => { if (isBrowser) try { localStorage.removeItem(API_KEY_KEY); } catch {} };
export const isAuthenticated = () => !!getToken();

// ── low‑level request helpers ────────────────────────────────
const unwrap = (r) => r?.data ?? r;
const wait = (ms) => new Promise(res => setTimeout(res, ms));
const getErrorMessage = (err, fallback = "Request failed") =>
  err?.response?.data?.message || err?.response?.data?.error || err?.response?.data?.details || err?.message || fallback;

const shouldRetry = (error) => {
  const s = error?.response?.status;
  if (s === 401 || s === 403) return false;
  if (!error?.response) return true;
  return s === 408 || s === 425 || s === 429 || s >= 500;
};

const normalizeBool = (val, fallback = false) => {
  if (val === true || val === false) return val;
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === 1 || val === "1") return true;
  if (val === 0 || val === "0") return false;
  return fallback;
};
const normalizeMode = (val, fallback = "paper") =>
  String(val || fallback || "paper").toLowerCase() === "live" ? "live" : "paper";

const parseMoney = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const p = Number(value.replace(/[$,]/g, ""));
    return Number.isFinite(p) ? p : 0;
  }
  if (value && typeof value === "object")
    return parseMoney(value.total ?? value.balance ?? value.equity ?? value.available ?? value.cash ?? value.usd ?? 0);
  return 0;
};

const makeRequestKey = (method, url, data) => `${String(method).toUpperCase()} ${url} ${data ? JSON.stringify(data) : ""}`;

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

const createApiClient = (baseURL) =>
  axios.create({ baseURL, timeout: API_CONFIG.timeout, headers: { "Content-Type": "application/json", Accept: "application/json" } });

const publicApi = createApiClient(API_BASE);
const userApi = createApiClient(USER_API_BASE);
const sniperApi = createApiClient(SNIPER_API_BASE);

const addAuthInterceptor = (apiClient) => {
  apiClient.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    const token = getToken();
    const apiKey = getApiKey();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (apiKey) config.headers["X-API-Key"] = apiKey;
    return config;
  });

  apiClient.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error?.config || {};
      const status = error?.response?.status;
      const url = config?.url || "";
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.error;
      if (status === 401 && (errorCode === "TOKEN_EXPIRED" || errorMessage === "jwt expired")) {
        clearToken(); clearApiKey(); clearCache();
        if (isBrowser && !window.location.pathname.includes("/login")) window.location.href = "/login?expired=true";
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

// ── defaults ──────────────────────────────────────────────────
const getDefaultActivationStatus = () => ({
  has_card_on_file: false, billing_complete: false, trading_enabled: false, paper_trading_enabled: false,
  okx_connected: false, okx_mode: "paper", alpaca_connected: false, alpaca_mode: "paper", wallet_connected: false,
  tier: "starter", activation_complete: false, tier_requirements_met: false, tier_required_integration: "Connect OKX or Alpaca for live trading",
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
  current_strategy: "ai_weighted", tier: "starter", _fallback: true,
});
const getDefaultLiveStats = () => ({
  summary: { total_pnl: 0, win_rate: 0, total_trades: 0, wins: 0, losses: 0, current_balance: 0, open_positions: 0, daily_pnl: 0, daily_trades: 0 },
  daily_performance: [], recent_trades: [], open_positions: [],
});

// ── generic connection helpers (exchange‑agnostic) ─────────
const getConnectionKey = (exchange) => String(exchange || "okx").toLowerCase();

const getConnectionStatus = (exchange, integrationStatus) => {
  const key = getConnectionKey(exchange);
  const s = integrationStatus || {};
  if (key === "okx") return { connected: normalizeBool(s.okx_connected), mode: normalizeMode(s.okx_mode), keyMasked: s.okx_api_key_masked || s.okx_key_masked || null, region: s.okx_region || "us" };
  if (key === "alpaca") return { connected: normalizeBool(s.alpaca_connected), mode: normalizeMode(s.alpaca_mode), keyMasked: s.alpaca_api_key_masked || null };
  // futures / dex placeholders
  return { connected: false, mode: "paper", keyMasked: null };
};

const getConnectionBalance = (exchange, balances) => {
  const key = getConnectionKey(exchange);
  const b = balances || {};
  if (key === "okx") return {
    total: parseMoney(b.okx_total ?? b.okx ?? b.total ?? 0),
    available: parseMoney(b.okx_available_usdt ?? b.okx_assets?.find?.(a => a.ccy === "USDT")?.available ?? 0),
  };
  if (key === "alpaca") return {
    total: parseMoney(b.alpaca_total ?? b.alpaca ?? 0),
    available: parseMoney(b.alpaca_available_usdt ?? b.alpaca ?? 0),
  };
  // futures / dex
  return { total: 0, available: 0 };
};

// ── core API methods ──────────────────────────────────────────
const getIntegrationStatus = async (skipCache = false) => {
  if (!skipCache) { const c = getCached("integration_status", 20000); if (c) return c; }
  try {
    const res = await requestWithDedupe(userApi, { method: "get", url: "/api/integrations/status" });
    const data = unwrap(res);
    const row = data?.data || data || {};
    const result = {
      wallet_connected: normalizeBool(row.wallet_connected),
      alpaca_connected: normalizeBool(row.alpaca_connected),
      okx_connected: normalizeBool(row.okx_connected),
      alpaca_api_key_masked: row.alpaca_api_key_masked || row.alpaca_key_masked || null,
      okx_api_key_masked: row.okx_api_key_masked || row.okx_key_masked || null,
      alpaca_mode: normalizeMode(row.alpaca_mode || row.alpaca_account_mode || row.alpaca_environment),
      okx_mode: normalizeMode(row.okx_mode || row.okx_account_mode || row.okx_environment),
      okx_region: row.okx_region || "us",
      wallet_address_masked: row.wallet_address_masked || row.wallet_masked || null,
    };
    setCached("integration_status", result);
    return result;
  } catch { return { wallet_connected: false, alpaca_connected: false, okx_connected: false, alpaca_api_key_masked: null, okx_api_key_masked: null, alpaca_mode: "paper", okx_mode: "paper", okx_region: "us", wallet_address_masked: null }; }
};

const getExchangeBalance = async (skipCache = false) => {
  const cacheKey = "exchange_balance";
  if (!skipCache) { const c = getCached(cacheKey, 10000); if (c) return c; }
  if (!getToken()) return { success: true, okx_total: 0, alpaca_total: 0, total: 0, okx_available_usdt: 0, alpaca_available_usdt: 0 };
  try {
    const res = await requestWithDedupe(userApi, { method: "get", url: "/api/exchanges/balance" });
    const data = unwrap(res);
    const row = data?.data || data || {};
    const result = {
      success: true,
      okx_total: parseMoney(row.okx_total ?? row.okx ?? row.total ?? 0),
      alpaca_total: parseMoney(row.alpaca_total ?? row.alpaca ?? 0),
      total: parseMoney(row.total) || parseMoney(row.okx_total) + parseMoney(row.alpaca_total),
      okx_available_usdt: parseMoney(row.okx_available_usdt ?? row.okx_assets?.find?.(a => a.ccy === "USDT")?.available ?? 0),
      alpaca_available_usdt: parseMoney(row.alpaca_available_usdt ?? row.alpaca ?? 0),
      // preserve raw assets for detail views
      okx_assets: row.okx_assets || [],
      alpaca_assets: row.alpaca_assets || [],
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) { return { success: false, okx_total: 0, alpaca_total: 0, total: 0, okx_available_usdt: 0, alpaca_available_usdt: 0, error: getErrorMessage(error, "Failed to load balance") }; }
};

const getLiveTradingStats = async (skipCache = false) => {
  const cacheKey = "live_trading_stats";
  if (!skipCache) { const c = getCached(cacheKey, 10000); if (c) return c; }
  if (!getToken()) return getDefaultLiveStats();
  try {
    const res = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/live-stats" });
    const data = unwrap(res);
    const stats = data?.data || data || getDefaultLiveStats();
    const result = {
      summary: {
        total_pnl: parseMoney(stats.summary?.total_pnl ?? stats.total_pnl ?? 0),
        win_rate: Number(stats.summary?.win_rate ?? stats.win_rate ?? 0),
        total_trades: Number(stats.summary?.total_trades ?? stats.total_trades ?? 0),
        wins: Number(stats.summary?.wins ?? stats.wins ?? 0),
        losses: Number(stats.summary?.losses ?? stats.losses ?? 0),
        current_balance: parseMoney(stats.summary?.current_balance ?? stats.current_balance ?? 0),
        open_positions: Number(stats.summary?.open_positions ?? stats.open_positions ?? 0),
        daily_pnl: parseMoney(stats.summary?.daily_pnl ?? stats.daily_pnl ?? 0),
        daily_trades: Number(stats.summary?.daily_trades ?? stats.daily_trades ?? 0),
      },
      daily_performance: stats.daily_performance || [],
      recent_trades: stats.recent_trades || [],
      open_positions: stats.open_positions || [],
    };
    setCached(cacheKey, result);
    return result;
  } catch { return getDefaultLiveStats(); }
};

const getLiveTradeHistory = async (limit = 20, skipCache = false) => {
  const cacheKey = `live_trade_history_${limit}`;
  if (!skipCache) { const c = getCached(cacheKey, 10000); if (c) return c; }
  if (!getToken()) return { success: true, trades: [] };
  try {
    const res = await requestWithDedupe(userApi, { method: "get", url: `/api/trading/live-trades?limit=${limit}` });
    const data = unwrap(res);
    const trades = data?.data?.trades || data?.trades || data?.data || [];
    const normalized = (Array.isArray(trades) ? trades : []).map(t => ({
      id: t.id || t.trade_id,
      symbol: t.symbol || t.asset,
      status: t.status || (t.closed_at ? "closed" : "open"),
      pnl: parseMoney(t.pnl ?? t.pnl_usd ?? t.profit_loss ?? 0),
      pnl_usd: parseMoney(t.pnl_usd ?? t.pnl ?? 0),
      entry_price: parseMoney(t.entry_price),
      exit_price: parseMoney(t.exit_price),
      quantity: parseMoney(t.quantity),
      created_at: t.created_at || t.open_time,
      closed_at: t.closed_at || t.close_time,
      label: t.label || t.type,
    }));
    const result = { success: true, trades: normalized };
    setCached(cacheKey, result);
    return result;
  } catch (error) { return { success: false, trades: [], error: getErrorMessage(error) }; }
};

// ── bot management (exchange‑agnostic) ────────────────────────
const startTradingBot = async (exchange, strategy, mode) => {
  try {
    const res = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/bot/start", data: { exchange, strategy, mode: normalizeMode(mode) } });
    clearTradingCache();
    return { success: true, ...unwrap(res) };
  } catch (error) { return { success: false, error: getErrorMessage(error, "Failed to start bot") }; }
};

const stopTradingBot = async (exchange) => {
  try {
    const res = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/bot/stop", data: { exchange } });
    clearTradingCache();
    return { success: true, ...unwrap(res) };
  } catch (error) { return { success: false, error: getErrorMessage(error, "Failed to stop bot") }; }
};

const getTradingBotStatus = async (skipCache = false) => {
  const cacheKey = "trading_bot_status";
  if (!skipCache) { const c = getCached(cacheKey, 5000); if (c) return c; }
  try {
    const res = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/bot/status" });
    const data = unwrap(res);
    const bots = (data?.data || data || []).map(b => ({
      ...b,
      isRunning: normalizeBool(b.isRunning ?? b.status === "running"),
      mode: normalizeMode(b.mode),
      exchange: String(b.exchange || "").toLowerCase(),
      strategy: b.strategy || "ai_weighted",
      started_at: b.started_at || b.start_time,
    }));
    const result = { success: true, data: bots };
    setCached(cacheKey, result);
    return result;
  } catch (error) { return { success: false, data: [], error: getErrorMessage(error) }; }
};

const isAnyBotRunning = async () => {
  const status = await getTradingBotStatus(true);
  return status.success && status.data?.some(b => b.isRunning);
};

// ── auth / user (unchanged but necessary) ────────────────────
const login = async (email, password) => { /* ... same as before ... */ };
const logout = () => { clearToken(); clearApiKey(); clearCache(); if (isBrowser) window.location.href = "/login"; };
const getMe = async (skipCache) => { /* ... */ };
const getActivationStatus = async (skipCache) => { /* ... */ };
const refreshActivation = () => getActivationStatus(true);
const getTrialStatus = async (skipCache) => { /* ... */ };
const getCardStatus = async (skipCache) => { /* ... */ };
const createSetupIntent = async (payload) => { /* ... */ };
const changePlan = async (tier) => { /* ... */ };
const connectOKX = async (payload) => { /* ... */ };
const connectAlpaca = async (payload) => { /* ... */ };
const switchExchangeMode = async (exchange, mode) => { /* ... */ };
const switchOKXToLive = () => switchExchangeMode("okx", "live");
const switchAlpacaToLive = () => switchExchangeMode("alpaca", "live");
const switchOKXToPaper = () => switchExchangeMode("okx", "paper");
const switchAlpacaToPaper = () => switchExchangeMode("alpaca", "paper");
const connectWallet = async (payload) => { /* ... */ };
const disconnectOKX = async () => { /* ... */ };
const disconnectAlpaca = async () => { /* ... */ };
const getImaliBalance = async () => { /* ... */ };
const getUserTradingStats = async (days, skipCache) => { /* ... */ };
const getTradingStrategies = async (skipCache) => { /* ... */ };
const updateUserStrategy = async (strategyId) => { /* ... */ };
const toggleTrading = async (enabled) => { /* ... */ };
const togglePaperTrading = async (enabled) => { /* ... */ };
const executePaperTrade = async () => { /* ... */ };
const getGlobalTrades = async (options) => { /* ... */ };

// ── export unified class ──────────────────────────────────────
class BotAPIClass {
  constructor() { this.api = userApi; this.sniperApi = sniperApi; this.publicApi = publicApi; this.request = request; }
  setToken = setToken; getToken = getToken; clearToken = clearToken;
  setApiKey = setApiKey; getApiKey = getApiKey; clearApiKey = clearApiKey;
  isAuthenticated = isAuthenticated; clearCache = clearCache; clearTradingCache = clearTradingCache;

  // auth
  login = login; logout = logout; getMe = getMe; refreshActivation = refreshActivation;
  getActivationStatus = getActivationStatus; getTrialStatus = getTrialStatus;
  getCardStatus = getCardStatus; createSetupIntent = createSetupIntent; changePlan = changePlan;

  // trading core
  getLiveTradingStats = getLiveTradingStats; getExchangeBalance = getExchangeBalance;
  getLiveTradeHistory = getLiveTradeHistory; getUserTradingStats = getUserTradingStats;
  getTradingStrategies = getTradingStrategies; updateUserStrategy = updateUserStrategy;
  toggleTrading = toggleTrading; togglePaperTrading = togglePaperTrading;
  executePaperTrade = executePaperTrade;

  // connections
  connectOKX = connectOKX; connectAlpaca = connectAlpaca; connectWallet = connectWallet;
  disconnectOKX = disconnectOKX; disconnectAlpaca = disconnectAlpaca;
  switchOKXToLive = switchOKXToLive; switchAlpacaToLive = switchAlpacaToLive;
  switchOKXToPaper = switchOKXToPaper; switchAlpacaToPaper = switchAlpacaToPaper;
  switchExchangeMode = switchExchangeMode; getIntegrationStatus = getIntegrationStatus;

  // generic connection helpers
  getConnectionKey = getConnectionKey;
  getConnectionStatus = getConnectionStatus;
  getConnectionBalance = getConnectionBalance;

  // bot management
  startTradingBot = startTradingBot; stopTradingBot = stopTradingBot;
  getTradingBotStatus = getTradingBotStatus; isAnyBotRunning = isAnyBotRunning;

  // other
  getImaliBalance = getImaliBalance; getGlobalTrades = getGlobalTrades;
}

const BotAPI = new BotAPIClass();
export default BotAPI;