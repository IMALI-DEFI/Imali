// src/utils/BotAPI.js - COMPLETE REWRITE
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

const getLivePositions = async (skipCache = false) => {
  const cacheKey = "live_positions";

  if (!skipCache) {
    const cached = getCached(cacheKey, 10000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: "/api/trading/live-positions",
    });

    const data = unwrap(response);
    const result = {
      success: true,
      positions: data?.data?.positions || data?.positions || [],
      total_value: data?.data?.total_value || data?.total_value || 0,
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, positions: [], total_value: 0, error: getErrorMessage(error, "Failed to load live positions") };
  }
};

const getLiveTradeHistory = async (limit = 50, skipCache = false) => {
  const cacheKey = `live_trade_history_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 20000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, {
      method: "get",
      url: `/api/trading/live-trades?limit=${limit}`,
    });

    const data = unwrap(response);
    const result = {
      success: true,
      trades: data?.data?.trades || data?.trades || [],
      summary: data?.data?.summary || data?.summary || {},
    };

    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], summary: {}, error: getErrorMessage(error, "Failed to load live trade history") };
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

const getCardStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("card_status");
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/billing/card-status" });
    const data = unwrap(response);

    const result = { success: true, has_card: !!data?.data?.has_card, billing_complete: !!data?.data?.billing_complete };

    setCached("card_status", result);
    return result;
  } catch {
    return { success: false, has_card: false, billing_complete: false };
  }
};

const createSetupIntent = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/setup-intent", data: payload });
    const data = unwrap(response);
    return { success: true, client_secret: data?.data?.client_secret, setup_intent_id: data?.data?.setup_intent_id };
  } catch (error) {
    return handleApiError(error, "Failed to create setup intent");
  }
};

const confirmCard = async (payload = {}) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/confirm-card", data: payload });
    clearCache("activation_status");
    clearCache("card_status");
    return { success: true, confirmed: unwrap(response)?.data?.confirmed || true };
  } catch (error) {
    return handleApiError(error, "Failed to confirm card");
  }
};

/* ================= BILLING & SUBSCRIPTION ================= */

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

const createCheckoutSession = async (priceId, successUrl, cancelUrl) => {
  try {
    const response = await requestWithDedupe(userApi, {
      method: "post",
      url: "/api/billing/create-checkout-session",
      data: { price_id: priceId, success_url: successUrl, cancel_url: cancelUrl },
    });
    const data = unwrap(response);
    
    if (data?.data?.session_url) {
      return { success: true, session_url: data.data.session_url, session_id: data.data.session_id };
    }
    
    return { success: false, error: "No checkout session created" };
  } catch (error) {
    return handleApiError(error, "Failed to create checkout session");
  }
};

const upgradeSubscription = async (newTierId) => changePlan(newTierId);
const downgradeSubscription = async (newTierId) => changePlan(newTierId);

const cancelSubscription = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/billing/cancel-subscription", data: {} });
    const data = unwrap(response);
    clearCache("user_me");
    clearCache("activation_status");
    return { success: true, message: data?.message || "Subscription cancelled successfully" };
  } catch (error) {
    return handleApiError(error, "Failed to cancel subscription");
  }
};

const getSubscriptionStatus = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/subscription/status" });
    const data = unwrap(response);
    return { success: true, data: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to get subscription status");
  }
};

const getAvailablePlans = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/subscription/plans" });
    const data = unwrap(response);
    return { success: true, data: data?.data || data };
  } catch (error) {
    return {
      success: true,
      data: {
        plans: [
          { id: "starter", name: "Starter", price: 0, interval: "month", features: [] },
          { id: "pro", name: "Pro", price: 19, interval: "month", features: ["Live Trading", "Stocks", "Crypto"] },
          { id: "elite", name: "Elite", price: 49, interval: "month", features: ["Everything in Pro", "DEX Trading", "Custom Indicators"] },
        ],
      },
    };
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

const updatePaperTrading = togglePaperTrading;

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
      url: "/api/trading/paper-trade",
      data: {},
    });
    const data = unwrap(response);
    return { success: true, trade: data?.data?.trade || data?.trade || null, message: data?.message || "Paper trade executed" };
  } catch (error) {
    return handleApiError(error, "Failed to execute paper trade");
  }
};

const getPaperTradingStatus = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/paper/status" });
    const data = unwrap(response);
    return {
      success: true,
      worker_running: data?.data?.worker_running === true,
      last_execution: data?.data?.last_execution || null,
      next_execution: data?.data?.next_execution || null,
    };
  } catch (error) {
    return { success: false, worker_running: false, error: getErrorMessage(error, "Status check failed") };
  }
};

const startPaperWorker = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/paper/start-worker", data: {} });
    const data = unwrap(response);
    return { success: true, message: data?.message || "Paper trading worker started" };
  } catch (error) {
    return handleApiError(error, "Failed to start paper worker");
  }
};

const stopPaperWorker = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/trading/paper/stop-worker", data: {} });
    const data = unwrap(response);
    return { success: true, message: data?.message || "Paper trading worker stopped" };
  } catch (error) {
    return handleApiError(error, "Failed to stop paper worker");
  }
};

const getPaperTradingRequirements = async () => {
  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/trading/paper/requirements" });
    const data = unwrap(response);
    return {
      success: true,
      requirements: data?.data || {
        requires_api_keys: false,
        requires_trial: true,
        trial_required: true,
        max_daily_trades: 100,
        min_balance: 1000,
        interval_seconds: 60,
      },
    };
  } catch (error) {
    return {
      success: true,
      requirements: {
        requires_api_keys: false,
        requires_trial: true,
        trial_required: true,
        max_daily_trades: 100,
        min_balance: 1000,
        interval_seconds: 60,
      },
    };
  }
};

const getPaperTradingHistory = async (limit = 50, skipCache = false) => {
  const cacheKey = `paper_trading_history_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/trading/paper/history?limit=${limit}` });
    const data = unwrap(response);
    const result = { success: true, trades: data?.data?.trades || data?.trades || [], summary: data?.data?.summary || data?.summary || {} };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], summary: {}, error: getErrorMessage(error, "Failed to load paper trading history") };
  }
};

/* ================= USER TRADING ENDPOINTS ================= */

const getUserTrades = async (options = {}) => {
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
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/user/trades?${params.toString()}` });
    const data = unwrap(response);
    const result = { success: true, trades: data?.data?.trades || data?.trades || [], summary: data?.data?.summary || data?.summary || {} };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], summary: {}, error: getErrorMessage(error, "Failed to load trades") };
  }
};

const getUserPositions = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_positions");
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/user/positions" });
    const data = unwrap(response);
    const result = { success: true, positions: data?.data?.positions || data?.positions || [], count: data?.data?.count || data?.count || 0 };
    setCached("user_positions", result);
    return result;
  } catch (error) {
    return { success: false, positions: [], count: 0, error: getErrorMessage(error, "Failed to load positions") };
  }
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
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/okx", data: payload });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect OKX");
  }
};

const connectAlpaca = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/alpaca", data: payload });
    clearTradingCache();
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to connect Alpaca");
  }
};

const connectWallet = async (payload) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/integrations/wallet", data: payload });
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

const getPublicDashboardHistorical = async (days = 30) => {
  try {
    const response = await requestWithDedupe(publicApi, { method: "get", url: `/api/public/dashboard/historical?days=${days}` }, { throttle: false });
    return unwrap(response);
  } catch (error) {
    return handleApiError(error, "Failed to load public dashboard data");
  }
};

/* ================= REFERRALS ================= */

const getReferralInfo = async (skipCache = false) => {
  const cacheKey = "referral_info";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/referrals/info" });
    const data = unwrap(response);
    const result = { success: true, data: data?.data || {} };
    setCached(cacheKey, result.data);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load referral info");
  }
};

const applyReferralCode = async (code) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/referrals/apply", data: { code } });
    clearCache("referral_info");
    clearCache("user_me");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to apply referral code");
  }
};

const getReferralStats = async (skipCache = false) => {
  const cacheKey = "referral_stats";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/referrals/stats" });
    const data = unwrap(response);
    const result = { success: true, data: data?.data || {} };
    setCached(cacheKey, result.data);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load referral stats");
  }
};

const claimReferralRewards = async (amount, walletAddress) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/referrals/claim", data: { amount, wallet_address: walletAddress } });
    clearCache("referral_info");
    clearCache("referral_stats");
    clearCache("user_me");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to claim referral rewards");
  }
};

/* ================= NEWSLETTER ================= */

const subscribeNewsletter = async ({ email, first_name, interest }) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/newsletter/subscribe", data: { email, first_name, interest } });
    return unwrap(response);
  } catch (error) {
    return handleApiError(error, "Newsletter signup failed");
  }
};

/* ================= PROMO ================= */

const getPromoStatus = async (skipCache = false) => {
  const cacheKey = "promo_status";

  if (!skipCache) {
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(publicApi, { method: "get", url: "/api/promo/status" });
    const data = unwrap(response);
    const result = data?.data || {};
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { limit: 50, claimed: 0, spots_left: 50, active: true, fee_percent: 5, duration_days: 90, threshold_percent: 3 };
  }
};

const claimPromo = async (email, tier = "starter") => {
  try {
    const response = await requestWithDedupe(publicApi, { method: "post", url: "/api/promo/claim", data: { email, tier } });
    clearCache("promo_status");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to claim promo");
  }
};

/* ================= HEALTH ================= */

const healthCheck = async () => {
  try {
    const response = await requestWithDedupe(publicApi, { method: "get", url: "/health" }, { throttle: false });
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Health check failed");
  }
};

/* ================= ENTERPRISE ================= */

const getOrganizationDetails = async (skipCache = false) => {
  const cacheKey = "enterprise_org_details";

  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/enterprise/organization" });
    const data = unwrap(response);
    const result = data?.data || data || {};
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, error: getErrorMessage(error, "Failed to load organization details") };
  }
};

const getOrganizationUsers = async (skipCache = false) => {
  const cacheKey = "enterprise_org_users";

  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/enterprise/organization/users" });
    const data = unwrap(response);
    const result = { success: true, users: data?.data?.users || data?.users || [] };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load organization users");
  }
};

const inviteTeamMember = async (email, role) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/enterprise/organization/invite", data: { email, role } });
    clearCache("enterprise_org_users");
    const data = unwrap(response);
    return { success: true, invitation: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to invite team member");
  }
};

const removeTeamMember = async (userId) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "delete", url: `/api/enterprise/organization/users/${userId}` });
    clearCache("enterprise_org_users");
    return { success: true, message: "Team member removed successfully" };
  } catch (error) {
    return handleApiError(error, "Failed to remove team member");
  }
};

const updateTeamMemberRole = async (userId, role) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "put", url: `/api/enterprise/organization/users/${userId}/role`, data: { role } });
    clearCache("enterprise_org_users");
    return { success: true, data: unwrap(response) };
  } catch (error) {
    return handleApiError(error, "Failed to update team member role");
  }
};

const getEnterpriseStrategies = async (skipCache = false) => {
  const cacheKey = "enterprise_strategies";

  if (!skipCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: "/api/enterprise/strategies" });
    const data = unwrap(response);
    const result = { success: true, strategies: data?.data?.strategies || data?.strategies || [], custom_config: data?.data?.custom_config || data?.custom_config || null };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load enterprise strategies");
  }
};

const updateCustomStrategy = async (strategyConfig) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "post", url: "/api/enterprise/strategies/customize", data: { strategy_config: strategyConfig } });
    clearCache("enterprise_strategies");
    clearTradingCache();
    const data = unwrap(response);
    return { success: true, config: data?.data || data };
  } catch (error) {
    return handleApiError(error, "Failed to update custom strategy");
  }
};

const getEnterpriseAnalytics = async (options = {}) => {
  const { days = 30, skipCache = false } = options;
  const cacheKey = `enterprise_analytics_${days}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/enterprise/analytics?days=${days}` });
    const data = unwrap(response);
    const result = { success: true, analytics: data?.data || data || {} };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load enterprise analytics");
  }
};

const updateCustomBranding = async (brandingConfig) => {
  try {
    const response = await requestWithDedupe(userApi, { method: "put", url: "/api/enterprise/branding", data: { branding: brandingConfig } });
    clearCache("enterprise_org_details");
    return { success: true, branding: unwrap(response)?.data };
  } catch (error) {
    return handleApiError(error, "Failed to update custom branding");
  }
};

const getAuditLogs = async (options = {}) => {
  const { limit = 50, offset = 0, skipCache = false } = options;
  const cacheKey = `enterprise_audit_logs_${limit}_${offset}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }

  try {
    const response = await requestWithDedupe(userApi, { method: "get", url: `/api/enterprise/audit-logs?limit=${limit}&offset=${offset}` });
    const data = unwrap(response);
    const result = { success: true, logs: data?.data?.logs || data?.logs || [], total: data?.data?.total || data?.total || 0 };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return handleApiError(error, "Failed to load audit logs");
  }
};

const requestEnterpriseApproval = async (payload) => {
  try {
    const response = await requestWithDedupe(publicApi, { method: "post", url: "/api/enterprise/request", data: payload }, { throttle: false });
    const data = unwrap(response);
    return { success: true, request_id: data?.data?.request_id || data?.request_id, message: data?.message || "Enterprise access request submitted" };
  } catch (error) {
    return handleApiError(error, "Failed to submit enterprise request");
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

  // Billing & Subscription
  changePlan(newTierId) { return changePlan(newTierId); }
  createCheckoutSession(priceId, successUrl, cancelUrl) { return createCheckoutSession(priceId, successUrl, cancelUrl); }
  upgradeSubscription(newTierId) { return upgradeSubscription(newTierId); }
  downgradeSubscription(newTierId) { return downgradeSubscription(newTierId); }
  cancelSubscription() { return cancelSubscription(); }
  getSubscriptionStatus() { return getSubscriptionStatus(); }
  getAvailablePlans() { return getAvailablePlans(); }

  // Live Trading
  getLiveTradingStats(skipCache) { return getLiveTradingStats(skipCache); }
  getExchangeBalance(skipCache) { return getExchangeBalance(skipCache); }
  getLivePositions(skipCache) { return getLivePositions(skipCache); }
  getLiveTradeHistory(limit, skipCache) { return getLiveTradeHistory(limit, skipCache); }

  // Trading
  getUserTrades(options) { return getUserTrades(options); }
  getUserPositions(skipCache) { return getUserPositions(skipCache); }
  getUserTradingStats(days, skipCache) { return getUserTradingStats(days, skipCache); }
  getTradingStrategies(skipCache) { return getTradingStrategies(skipCache); }
  updateUserStrategy(strategy) { return updateUserStrategy(strategy); }
  toggleTrading(enabled) { return toggleTrading(enabled); }
  togglePaperTrading(enabled) { return togglePaperTrading(enabled); }
  updatePaperTrading(enabled) { return updatePaperTrading(enabled); }
  
  // Paper trading worker methods
  executePaperTrade() { return executePaperTrade(); }
  getPaperTradingStatus() { return getPaperTradingStatus(); }
  startPaperWorker() { return startPaperWorker(); }
  stopPaperWorker() { return stopPaperWorker(); }
  getPaperTradingRequirements() { return getPaperTradingRequirements(); }
  getPaperTradingHistory(limit, skipCache) { return getPaperTradingHistory(limit, skipCache); }

  // Integrations
  connectOKX(payload) { return connectOKX(payload); }
  connectAlpaca(payload) { return connectAlpaca(payload); }
  connectWallet(payload) { return connectWallet(payload); }
  disconnectOKX() { return disconnectOKX(); }
  disconnectAlpaca() { return disconnectAlpaca(); }
  switchAlpacaToLive() { return switchAlpacaToLive(); }
  switchOKXToLive() { return switchOKXToLive(); }
  getIntegrationStatus(skipCache) { return getIntegrationStatus(skipCache); }

  // Public/global
  getGlobalTrades(options) { return getGlobalTrades(options); }
  getPublicDashboardHistorical(days) { return getPublicDashboardHistorical(days); }

  // Referrals
  getReferralInfo(skipCache) { return getReferralInfo(skipCache); }
  applyReferralCode(code) { return applyReferralCode(code); }
  getReferralStats(skipCache) { return getReferralStats(skipCache); }
  claimReferralRewards(amount, walletAddress) { return claimReferralRewards(amount, walletAddress); }

  // Newsletter
  subscribeNewsletter(payload) { return subscribeNewsletter(payload); }

  // Promo
  getPromoStatus(skipCache) { return getPromoStatus(skipCache); }
  claimPromo(email, tier) { return claimPromo(email, tier); }

  // Enterprise
  getOrganizationDetails(skipCache) { return getOrganizationDetails(skipCache); }
  getOrganizationUsers(skipCache) { return getOrganizationUsers(skipCache); }
  inviteTeamMember(email, role) { return inviteTeamMember(email, role); }
  removeTeamMember(userId) { return removeTeamMember(userId); }
  updateTeamMemberRole(userId, role) { return updateTeamMemberRole(userId, role); }
  getEnterpriseStrategies(skipCache) { return getEnterpriseStrategies(skipCache); }
  updateCustomStrategy(strategyConfig) { return updateCustomStrategy(strategyConfig); }
  getEnterpriseAnalytics(options) { return getEnterpriseAnalytics(options); }
  updateCustomBranding(brandingConfig) { return updateCustomBranding(brandingConfig); }
  getAuditLogs(options) { return getAuditLogs(options); }
  requestEnterpriseApproval(payload) { return requestEnterpriseApproval(payload); }

  // Debug
  healthCheck() { return healthCheck(); }
}

// Create the BotAPI instance
const BotAPI = new BotAPIClass();

// DEFAULT EXPORT ONLY
export default BotAPI;
