// src/utils/BotAPI.js - Unified IMALI API layer

import axios from "axios";

const API_BASE = (
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"
).replace(/\/+$/, "");

const USER_API_BASE = (
  process.env.REACT_APP_USER_API_BASE_URL || API_BASE
).replace(/\/+$/, "");

const SNIPER_API_BASE = (
  process.env.REACT_APP_SNIPER_API_BASE_URL || API_BASE
).replace(/\/+$/, "");

const TOKEN_KEY = "imali_token";
const API_KEY_KEY = "imali_api_key";
const isBrowser = typeof window !== "undefined";

const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 2,
  retryDelay: 900,
  cacheTTL: 60000,
  rateLimitCooldown: 500,
};

const cache = new Map();
const inflight = new Map();
const lastRequestAt = new Map();

// ─────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────

export const getToken = () => {
  try {
    return isBrowser ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!isBrowser) return;
  try {
    token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const clearToken = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const getApiKey = () => {
  try {
    return isBrowser ? localStorage.getItem(API_KEY_KEY) : null;
  } catch {
    return null;
  }
};

export const setApiKey = (key) => {
  if (!isBrowser) return;
  try {
    key ? localStorage.setItem(API_KEY_KEY, key) : localStorage.removeItem(API_KEY_KEY);
  } catch {}
};

export const clearApiKey = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch {}
};

export const isAuthenticated = () => Boolean(getToken());

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const unwrapAxios = (res) => res?.data ?? res;

const unwrapPayload = (res) => {
  const data = unwrapAxios(res);
  return data?.data ?? data ?? {};
};

const getErrorMessage = (err, fallback = "Request failed") => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.response?.data?.details ||
    err?.message ||
    fallback
  );
};

const normalizeBool = (value, fallback = false) => {
  if (value === true || value === false) return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;

  const text = String(value || "").toLowerCase();

  if (["true", "running", "active", "started", "on", "enabled"].includes(text)) return true;
  if (["false", "stopped", "inactive", "off", "disabled"].includes(text)) return false;

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
    return parseMoney(
      value.total ??
        value.balance ??
        value.equity ??
        value.available ??
        value.cash ??
        value.usd ??
        0
    );
  }

  return 0;
};

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
    if (String(key).includes(pattern)) cache.delete(key);
  }
};

const clearTradingCache = () => {
  [
    "integration_status",
    "exchange_balance",
    "live_trading_stats",
    "live_trade_history",
    "trading_bot_status",
    "open_positions",
    "user_trading_stats",
    "user_trades",
    "trading_strategies",
    "activation_status",
    "trial_status",
    "card_status",
  ].forEach(clearCache);
};

const shouldRetry = (error) => {
  const status = error?.response?.status;

  if (status === 401 || status === 403) return false;
  if (!error?.response) return true;

  return status === 408 || status === 425 || status === 429 || status >= 500;
};

const makeRequestKey = (method, url, data, params) => {
  return `${String(method).toUpperCase()} ${url} ${
    data ? JSON.stringify(data) : ""
  } ${params ? JSON.stringify(params) : ""}`;
};

const throttleRequest = async (key) => {
  const last = lastRequestAt.get(key) || 0;
  const elapsed = Date.now() - last;

  if (elapsed < API_CONFIG.rateLimitCooldown) {
    await wait(API_CONFIG.rateLimitCooldown - elapsed);
  }

  lastRequestAt.set(key, Date.now());
};

const createApiClient = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

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
      const errorCode = error?.response?.data?.code;
      const errorMessage = error?.response?.data?.error;

      if (
        status === 401 &&
        (errorCode === "TOKEN_EXPIRED" ||
          errorMessage === "jwt expired" ||
          errorMessage === "invalid token")
      ) {
        clearToken();
        clearApiKey();
        clearCache();

        if (isBrowser && !window.location.pathname.includes("/login")) {
          window.location.href = "/login?expired=true";
        }

        return Promise.reject(error);
      }

      if (
        shouldRetry(error) &&
        config &&
        (config.__retryCount || 0) < API_CONFIG.retryAttempts
      ) {
        config.__retryCount = (config.__retryCount || 0) + 1;

        const retryAfter = Number(error?.response?.headers?.["retry-after"] || 0);
        const delay =
          retryAfter > 0
            ? retryAfter * 1000
            : API_CONFIG.retryDelay * config.__retryCount;

        await wait(delay);
        return apiClient(config);
      }

      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(userApi);
addAuthInterceptor(sniperApi);

const requestWithDedupe = async (client, config, options = {}) => {
  const method = String(config.method || "get").toLowerCase();
  const url = config.url || "";
  const data = config.data || null;
  const params = config.params || null;
  const key = makeRequestKey(method, url, data, params);

  if (options.throttle !== false) await throttleRequest(key);

  if (method === "get" && inflight.has(key)) {
    return inflight.get(key);
  }

  const promise = client(config).finally(() => inflight.delete(key));

  if (method === "get") {
    inflight.set(key, promise);
  }

  return promise;
};

export const request = async (url, options = {}) => {
  const method = String(options.method || "GET").toLowerCase();

  let body = options.data;

  if (options.body) {
    try {
      body = JSON.parse(options.body);
    } catch {
      body = options.body;
    }
  }

  try {
    const res = await requestWithDedupe(userApi, {
      url,
      method,
      data: body,
      params: options.params,
    });

    return unwrapAxios(res);
  } catch (error) {
    throw {
      ...error,
      message: getErrorMessage(error),
      status: error?.response?.status,
    };
  }
};

// ─────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────

const getDefaultIntegrationStatus = () => ({
  wallet_connected: false,
  okx_connected: false,
  okx_mode: "paper",
  okx_api_key_masked: null,
  okx_region: "us",
  alpaca_connected: false,
  alpaca_mode: "paper",
  alpaca_api_key_masked: null,
});

const getDefaultLiveStats = () => ({
  success: true,
  summary: {
    total_pnl: 0,
    realized_pnl: 0,
    unrealized_pnl: 0,
    win_rate: 0,
    total_trades: 0,
    wins: 0,
    losses: 0,
    current_balance: 0,
    open_positions: 0,
    daily_pnl: 0,
    daily_trades: 0,
  },
  daily_performance: [],
  recent_trades: [],
  open_positions: [],
});

const getDefaultStrategies = () => ({
  success: true,
  strategies: [
    {
      id: "mean_reversion",
      name: "Mean Reversion",
      risk_level: "low",
      min_tier: "starter",
    },
    {
      id: "ai_weighted",
      name: "AI Weighted",
      risk_level: "medium",
      min_tier: "starter",
    },
    {
      id: "momentum",
      name: "Momentum",
      risk_level: "medium",
      min_tier: "starter",
    },
    {
      id: "aggressive",
      name: "Aggressive",
      risk_level: "high",
      min_tier: "pro",
    },
  ],
  current_strategy: "ai_weighted",
  tier: "starter",
  _fallback: true,
});

// ─────────────────────────────────────────────
// Auth / User
// ─────────────────────────────────────────────

const login = async (email, password) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/auth/login",
      data: { email, password },
    });

    const data = unwrapPayload(res);
    const token = data.token || data.access_token || data.jwt;

    if (token) setToken(token);

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Login failed"),
    };
  }
};

const register = async (payload) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/auth/register",
      data: payload,
    });

    const data = unwrapPayload(res);
    const token = data.token || data.access_token || data.jwt;

    if (token) setToken(token);

    return {
      success: true,
      ...data,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Registration failed"),
    };
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

const getMe = async (skipCache = false) => {
  const cacheKey = "user_me";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/user/me",
    });

    const data = unwrapPayload(res);
    setCached(cacheKey, data);

    return data;
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to load user"),
    };
  }
};

// ─────────────────────────────────────────────
// Integration / Exchange Status
// ─────────────────────────────────────────────

const getIntegrationStatus = async (skipCache = false) => {
  const cacheKey = "integration_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 10000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/integrations/status",
    });

    const row = unwrapPayload(res);

    const result = {
      success: true,

      wallet_connected: normalizeBool(row.wallet_connected),
      wallet_address_masked: row.wallet_address_masked || row.wallet_masked || null,

      okx_connected: normalizeBool(row.okx_connected || row.okxConnected),
      okx_mode: normalizeMode(
        row.okx_mode || row.okx_account_mode || row.okx_environment
      ),
      okx_api_key_masked:
        row.okx_api_key_masked || row.okx_key_masked || row.okxApiKeyMasked || null,
      okx_region: row.okx_region || "us",

      alpaca_connected: normalizeBool(row.alpaca_connected || row.alpacaConnected),
      alpaca_mode: normalizeMode(
        row.alpaca_mode || row.alpaca_account_mode || row.alpaca_environment
      ),
      alpaca_api_key_masked:
        row.alpaca_api_key_masked ||
        row.alpaca_key_masked ||
        row.alpacaApiKeyMasked ||
        null,
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      ...getDefaultIntegrationStatus(),
      error: getErrorMessage(error, "Failed to load integration status"),
    };
  }
};

const getConnectionKey = (exchange) => {
  return String(exchange || "okx").toLowerCase();
};

const getConnectionStatus = (exchange, integrationStatus) => {
  const key = getConnectionKey(exchange);
  const status = integrationStatus || {};

  if (key === "okx") {
    return {
      connected: normalizeBool(status.okx_connected),
      mode: normalizeMode(status.okx_mode),
      keyMasked: status.okx_api_key_masked || null,
      region: status.okx_region || "us",
    };
  }

  if (key === "alpaca") {
    return {
      connected: normalizeBool(status.alpaca_connected),
      mode: normalizeMode(status.alpaca_mode),
      keyMasked: status.alpaca_api_key_masked || null,
    };
  }

  return {
    connected: false,
    mode: "paper",
    keyMasked: null,
  };
};

const switchExchangeMode = async (exchange, mode) => {
  try {
    const normalizedExchange = getConnectionKey(exchange);
    const normalizedMode = normalizeMode(mode);

    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/mode",
      data: {
        exchange: normalizedExchange,
        mode: normalizedMode,
      },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to switch exchange mode"),
    };
  }
};

const switchOKXToLive = () => switchExchangeMode("okx", "live");
const switchOKXToPaper = () => switchExchangeMode("okx", "paper");
const switchAlpacaToLive = () => switchExchangeMode("alpaca", "live");
const switchAlpacaToPaper = () => switchExchangeMode("alpaca", "paper");

const connectOKX = async (payload) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/okx/connect",
      data: payload,
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to connect OKX"),
    };
  }
};

const connectAlpaca = async (payload) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/alpaca/connect",
      data: payload,
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to connect Alpaca"),
    };
  }
};

const disconnectOKX = async () => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "delete",
      url: "/api/integrations/okx",
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to disconnect OKX"),
    };
  }
};

const disconnectAlpaca = async () => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "delete",
      url: "/api/integrations/alpaca",
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to disconnect Alpaca"),
    };
  }
};

const connectWallet = async (payload) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/integrations/wallet/connect",
      data: payload,
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to connect wallet"),
    };
  }
};

// ─────────────────────────────────────────────
// Balances
// ─────────────────────────────────────────────

const getExchangeBalance = async (skipCache = false) => {
  const cacheKey = "exchange_balance";

  if (!skipCache) {
    const cached = getCached(cacheKey, 5000);
    if (cached) return cached;
  }

  if (!getToken()) {
    return {
      success: true,
      okx_total: 0,
      okx_available_usdt: 0,
      alpaca_total: 0,
      alpaca_available_usd: 0,
      total: 0,
      okx_assets: [],
      alpaca_assets: [],
    };
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/exchanges/balance",
    });

    const row = unwrapPayload(res);

    const okxAssets = Array.isArray(row.okx_assets) ? row.okx_assets : [];
    const alpacaAssets = Array.isArray(row.alpaca_assets) ? row.alpaca_assets : [];

    const okxAvailableFromAssets = okxAssets.find((a) => a.ccy === "USDT")?.available;

    const result = {
      success: true,

      okx_total: parseMoney(row.okx_total ?? row.okx_total_usd ?? row.okx ?? row.total ?? 0),
      okx_available_usdt: parseMoney(
        row.okx_available_usdt ?? row.okxAvailableUsdt ?? okxAvailableFromAssets ?? 0
      ),

      alpaca_total: parseMoney(row.alpaca_total ?? row.alpaca_equity ?? row.alpaca ?? 0),
      alpaca_available_usd: parseMoney(
        row.alpaca_available_usd ??
          row.alpaca_available_usdt ??
          row.alpaca_cash ??
          row.cash ??
          0
      ),

      total: parseMoney(row.total),
      okx_assets: okxAssets,
      alpaca_assets: alpacaAssets,
    };

    if (!result.total) {
      result.total = result.okx_total + result.alpaca_total;
    }

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      okx_total: 0,
      okx_available_usdt: 0,
      alpaca_total: 0,
      alpaca_available_usd: 0,
      total: 0,
      okx_assets: [],
      alpaca_assets: [],
      error: getErrorMessage(error, "Failed to load balance"),
    };
  }
};

const getConnectionBalance = (exchange, balances) => {
  const key = getConnectionKey(exchange);
  const balance = balances || {};

  if (key === "okx") {
    return {
      total: parseMoney(balance.okx_total ?? balance.okx ?? balance.total ?? 0),
      available: parseMoney(balance.okx_available_usdt ?? 0),
    };
  }

  if (key === "alpaca") {
    return {
      total: parseMoney(balance.alpaca_total ?? balance.alpaca ?? 0),
      available: parseMoney(balance.alpaca_available_usd ?? balance.alpaca_available_usdt ?? 0),
    };
  }

  return {
    total: 0,
    available: 0,
  };
};

// ─────────────────────────────────────────────
// Bot Management
// ─────────────────────────────────────────────

const normalizeBot = (bot = {}) => {
  return {
    ...bot,
    isRunning:
      normalizeBool(bot.isRunning) ||
      normalizeBool(bot.running) ||
      normalizeBool(bot.botRunning) ||
      String(bot.status || "").toLowerCase() === "running" ||
      String(bot.bot_status || "").toLowerCase() === "running",
    mode: normalizeMode(bot.mode || bot.bot_mode || bot.trading_mode),
    exchange: String(bot.exchange || "okx").toLowerCase(),
    strategy: bot.strategy || bot.strategy_id || bot.currentStrategy || "ai_weighted",
    started_at: bot.started_at || bot.start_time || bot.startedAt || null,
  };
};

const getTradingBotStatus = async (skipCache = false) => {
  const cacheKey = "trading_bot_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 3000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/bot/status",
    });

    const raw = unwrapPayload(res);

    let rawBots = [];

    if (Array.isArray(raw)) {
      rawBots = raw;
    } else if (Array.isArray(raw.bots)) {
      rawBots = raw.bots;
    } else if (Array.isArray(raw.data)) {
      rawBots = raw.data;
    } else if (raw && typeof raw === "object") {
      rawBots = [raw];
    }

    const bots = rawBots.map(normalizeBot);
    const activeBot = bots.find((b) => b.isRunning) || bots[0] || null;

    const result = {
      success: true,
      data: bots,
      bots,
      activeBot,
      isRunning: bots.some((b) => b.isRunning),
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      data: [],
      bots: [],
      activeBot: null,
      isRunning: false,
      error: getErrorMessage(error, "Failed to load bot status"),
    };
  }
};

const isAnyBotRunning = async () => {
  const status = await getTradingBotStatus(true);
  return Boolean(status?.isRunning || status?.data?.some?.((bot) => bot.isRunning));
};

const startTradingBot = async (exchange = "okx", strategy = "ai_weighted", mode = "paper") => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/bot/start",
      data: {
        exchange: getConnectionKey(exchange),
        strategy,
        mode: normalizeMode(mode),
      },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to start bot"),
    };
  }
};

const stopTradingBot = async (exchange = "okx") => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/bot/stop",
      data: {
        exchange: getConnectionKey(exchange),
      },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to stop bot"),
    };
  }
};

const closeAllPositions = async (exchange = "okx") => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/positions/close-all",
      data: {
        exchange: getConnectionKey(exchange),
      },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to close positions"),
    };
  }
};

// ─────────────────────────────────────────────
// Trading Data
// ─────────────────────────────────────────────

const getOpenPositions = async (exchange = "okx", skipCache = false) => {
  const key = getConnectionKey(exchange);
  const cacheKey = `open_positions_${key}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 5000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/positions/open",
      params: { exchange: key },
    });

    const raw = unwrapPayload(res);
    const positions = raw.positions || raw.open_positions || raw.openPositions || [];

    const result = {
      success: true,
      positions: Array.isArray(positions) ? positions : [],
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      positions: [],
      error: getErrorMessage(error, "Failed to load positions"),
    };
  }
};

const getLiveTradingStats = async (exchangeOrSkipCache = false, maybeSkipCache = false) => {
  const exchange =
    typeof exchangeOrSkipCache === "string" ? exchangeOrSkipCache : null;

  const skipCache =
    typeof exchangeOrSkipCache === "boolean" ? exchangeOrSkipCache : maybeSkipCache;

  const key = exchange ? getConnectionKey(exchange) : "all";
  const cacheKey = `live_trading_stats_${key}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 5000);
    if (cached) return cached;
  }

  if (!getToken()) return getDefaultLiveStats();

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/live-stats",
      params: exchange ? { exchange: key } : undefined,
    });

    const raw = unwrapPayload(res);
    const summary = raw.summary || raw;

    const result = {
      success: true,
      summary: {
        total_pnl: parseMoney(summary.total_pnl ?? summary.totalPnl ?? 0),
        realized_pnl: parseMoney(summary.realized_pnl ?? summary.realizedPnl ?? 0),
        unrealized_pnl: parseMoney(summary.unrealized_pnl ?? summary.unrealizedPnl ?? 0),
        win_rate: Number(summary.win_rate ?? summary.winRate ?? 0),
        total_trades: Number(summary.total_trades ?? summary.totalTrades ?? 0),
        wins: Number(summary.wins ?? 0),
        losses: Number(summary.losses ?? 0),
        current_balance: parseMoney(summary.current_balance ?? summary.currentBalance ?? 0),
        open_positions: Number(summary.open_positions ?? summary.openPositions ?? 0),
        daily_pnl: parseMoney(summary.daily_pnl ?? summary.dailyPnl ?? 0),
        daily_trades: Number(summary.daily_trades ?? summary.dailyTrades ?? 0),
      },
      daily_performance: raw.daily_performance || raw.dailyPerformance || [],
      recent_trades: raw.recent_trades || raw.recentTrades || [],
      open_positions: raw.open_positions || raw.openPositions || [],
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      ...getDefaultLiveStats(),
      success: false,
      error: getErrorMessage(error, "Failed to load live stats"),
    };
  }
};

const getLiveTradeHistory = async (
  limit = 20,
  exchangeOrSkipCache = false,
  maybeSkipCache = false
) => {
  const exchange =
    typeof exchangeOrSkipCache === "string" ? exchangeOrSkipCache : null;

  const skipCache =
    typeof exchangeOrSkipCache === "boolean" ? exchangeOrSkipCache : maybeSkipCache;

  const key = exchange ? getConnectionKey(exchange) : "all";
  const cacheKey = `live_trade_history_${key}_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 5000);
    if (cached) return cached;
  }

  if (!getToken()) {
    return {
      success: true,
      trades: [],
    };
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/live-trades",
      params: {
        limit,
        ...(exchange ? { exchange: key } : {}),
      },
    });

    const raw = unwrapPayload(res);
    const trades = raw.trades || raw.history || raw.recent_trades || [];

    const normalized = Array.isArray(trades)
      ? trades.map((trade) => ({
          id: trade.id || trade.trade_id,
          exchange: trade.exchange || key,
          symbol: trade.symbol || trade.asset || trade.instId,
          side: trade.side || trade.action,
          status: trade.status || (trade.closed_at ? "closed" : "open"),
          strategy: trade.strategy || trade.label || trade.type,
          pnl: parseMoney(trade.pnl ?? trade.pnl_usd ?? trade.profit_loss ?? 0),
          pnl_usd: parseMoney(trade.pnl_usd ?? trade.pnl ?? 0),
          entry_price: parseMoney(trade.entry_price ?? trade.entryPrice),
          exit_price: parseMoney(trade.exit_price ?? trade.exitPrice),
          quantity: parseMoney(trade.quantity ?? trade.qty ?? trade.size),
          created_at: trade.created_at || trade.open_time || trade.createdAt,
          closed_at: trade.closed_at || trade.close_time || trade.closedAt,
        }))
      : [];

    const result = {
      success: true,
      trades: normalized,
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return {
      success: false,
      trades: [],
      error: getErrorMessage(error, "Failed to load trades"),
    };
  }
};

// ─────────────────────────────────────────────
// Strategies / User Trading
// ─────────────────────────────────────────────

const getTradingStrategies = async (skipCache = false) => {
  const cacheKey = "trading_strategies";

  if (!skipCache) {
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/strategies",
    });

    const raw = unwrapPayload(res);

    const result = {
      success: true,
      strategies: raw.strategies || raw.data || getDefaultStrategies().strategies,
      current_strategy: raw.current_strategy || raw.currentStrategy || "ai_weighted",
      tier: raw.tier || "starter",
    };

    setCached(cacheKey, result);
    return result;
  } catch {
    return getDefaultStrategies();
  }
};

const updateUserStrategy = async (strategyId) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/strategy",
      data: {
        strategy: strategyId,
      },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to update strategy"),
    };
  }
};

const getUserTradingStats = async (days = 30, skipCache = false) => {
  const cacheKey = `user_trading_stats_${days}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/user-stats",
      params: { days },
    });

    const data = unwrapPayload(res);
    setCached(cacheKey, data);

    return data;
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to load user trading stats"),
    };
  }
};

const toggleTrading = async (enabled) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/toggle",
      data: { enabled: Boolean(enabled) },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle trading"),
    };
  }
};

const togglePaperTrading = async (enabled) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/toggle",
      data: { enabled: Boolean(enabled) },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to toggle paper trading"),
    };
  }
};

const executePaperTrade = async (payload = {}) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/trading/paper/execute",
      data: payload,
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to execute paper trade"),
    };
  }
};

// ─────────────────────────────────────────────
// Activation / Billing
// ─────────────────────────────────────────────

const getActivationStatus = async (skipCache = false) => {
  const cacheKey = "activation_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/user/activation-status",
    });

    const data = unwrapPayload(res);
    setCached(cacheKey, data);

    return data;
  } catch (error) {
    return {
      success: false,
      has_card_on_file: false,
      billing_complete: false,
      trading_enabled: false,
      paper_trading_enabled: false,
      tier: "starter",
      error: getErrorMessage(error, "Failed to load activation status"),
    };
  }
};

const refreshActivation = () => getActivationStatus(true);

const getTrialStatus = async (skipCache = false) => {
  const cacheKey = "trial_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/user/trial-status",
    });

    const data = unwrapPayload(res);
    setCached(cacheKey, data);

    return data;
  } catch {
    return {
      trial_status: "inactive",
      paper_trading_enabled: false,
      seconds_remaining: 0,
      active: false,
    };
  }
};

const getCardStatus = async (skipCache = false) => {
  const cacheKey = "card_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/billing/card-status",
    });

    const data = unwrapPayload(res);
    setCached(cacheKey, data);

    return data;
  } catch (error) {
    return {
      success: false,
      has_card_on_file: false,
      error: getErrorMessage(error, "Failed to load card status"),
    };
  }
};

const createSetupIntent = async (payload = {}) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/billing/setup-intent",
      data: payload,
    });

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to create setup intent"),
    };
  }
};

const changePlan = async (tier) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/billing/change-plan",
      data: { tier },
    });

    clearTradingCache();

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, "Failed to change plan"),
    };
  }
};

// ─────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────

const getImaliBalance = async () => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/wallet/imali-balance",
    });

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      balance: 0,
      error: getErrorMessage(error, "Failed to load IMALI balance"),
    };
  }
};

const getGlobalTrades = async (options = {}) => {
  try {
    const res = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/global-trades",
      params: options,
    });

    return {
      success: true,
      ...unwrapPayload(res),
    };
  } catch (error) {
    return {
      success: false,
      trades: [],
      error: getErrorMessage(error, "Failed to load global trades"),
    };
  }
};

// ─────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────

class BotAPIClass {
  constructor() {
    this.api = userApi;
    this.sniperApi = sniperApi;
    this.publicApi = publicApi;
    this.request = request;
  }

  setToken = setToken;
  getToken = getToken;
  clearToken = clearToken;

  setApiKey = setApiKey;
  getApiKey = getApiKey;
  clearApiKey = clearApiKey;

  isAuthenticated = isAuthenticated;
  clearCache = clearCache;
  clearTradingCache = clearTradingCache;

  login = login;
  register = register;
  logout = logout;
  getMe = getMe;

  getActivationStatus = getActivationStatus;
  refreshActivation = refreshActivation;
  getTrialStatus = getTrialStatus;
  getCardStatus = getCardStatus;
  createSetupIntent = createSetupIntent;
  changePlan = changePlan;

  getIntegrationStatus = getIntegrationStatus;
  getConnectionStatus = getConnectionStatus;
  getConnectionBalance = getConnectionBalance;
  getConnectionKey = getConnectionKey;

  connectOKX = connectOKX;
  connectAlpaca = connectAlpaca;
  disconnectOKX = disconnectOKX;
  disconnectAlpaca = disconnectAlpaca;
  connectWallet = connectWallet;

  switchExchangeMode = switchExchangeMode;
  switchOKXToLive = switchOKXToLive;
  switchOKXToPaper = switchOKXToPaper;
  switchAlpacaToLive = switchAlpacaToLive;
  switchAlpacaToPaper = switchAlpacaToPaper;

  getExchangeBalance = getExchangeBalance;
  getLiveTradingStats = getLiveTradingStats;
  getLiveTradeHistory = getLiveTradeHistory;
  getOpenPositions = getOpenPositions;

  startTradingBot = startTradingBot;
  stopTradingBot = stopTradingBot;
  getTradingBotStatus = getTradingBotStatus;
  isAnyBotRunning = isAnyBotRunning;
  closeAllPositions = closeAllPositions;

  getTradingStrategies = getTradingStrategies;
  updateUserStrategy = updateUserStrategy;
  getUserTradingStats = getUserTradingStats;
  toggleTrading = toggleTrading;
  togglePaperTrading = togglePaperTrading;
  executePaperTrade = executePaperTrade;

  getImaliBalance = getImaliBalance;
  getGlobalTrades = getGlobalTrades;
}

const BotAPI = new BotAPIClass();

export default BotAPI;