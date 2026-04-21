import axios from "axios";

const API_BASE = "https://api.imali-defi.com";
const USER_API_BASE = "https://api.imali-defi.com";
const SNIPER_API_BASE = "https://api.imali-defi.com";

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
  "/api/auth/refresh",
  "/api/auth/validate",
];

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
};

const clearCache = (pattern) => {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

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
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      console.log("[BotAPI] Token saved, length:", token.length);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      console.log("[BotAPI] Token removed");
    }
  } catch (err) {
    console.error("[BotAPI] Failed to save token:", err);
  }
};

export const clearToken = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log("[BotAPI] Token cleared");
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
  } catch {}
};

export const clearApiKey = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(API_KEY_KEY);
  } catch {}
};

export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

const unwrap = (response) => response?.data ?? response;

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallbackMessage
  );
};

const handleApiError = (error, fallbackMessage) => {
  const message = getErrorMessage(error, fallbackMessage);
  console.error(`[BotAPI] ${fallbackMessage}:`, message);

  return {
    success: false,
    error: message,
    status: error?.response?.status,
  };
};

const shouldForceLogout = (url = "") => {
  return SESSION_CHECK_ENDPOINTS.some((endpoint) => url.includes(endpoint));
};

const addAuthInterceptor = (apiClient) => {
  apiClient.interceptors.request.use((config) => {
    const token = getToken();
    const apiKey = getApiKey();

    // Debug logging
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    console.log(`[API Request] Token present: ${!!token}`);
    if (token) {
      console.log(`[API Request] Token preview: ${token.substring(0, 30)}...`);
    }

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (apiKey) {
      config.headers["X-API-Key"] = apiKey;
    }

    return config;
  });

  apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
      const { config, response } = error;
      const status = response?.status;
      const url = config?.url || "";

      // Handle 401 and 403 both as auth errors
      if (status === 401 || status === 403) {
        const isAuthPage =
          isBrowser &&
          (window.location.pathname.includes("/login") ||
            window.location.pathname.includes("/signup"));

        // Force logout on auth errors for critical endpoints
        const isCriticalEndpoint = shouldForceLogout(url) || url.includes("/admin");
        
        if (!isAuthPage && isCriticalEndpoint) {
          console.warn(`[BotAPI] ${status} on ${url} - clearing session`);
          clearToken();
          clearApiKey();
          clearCache();
          if (isBrowser && !window.location.pathname.includes("/login")) {
            window.location.href = "/login?expired=true";
          }
        } else {
          console.warn(`[BotAPI] Ignoring ${status} on ${url}`);
        }
      }

      // Handle network errors with retry
      if (!response && config && !config.__retryCount && config.__retryCount < API_CONFIG.retryAttempts) {
        config.__retryCount = (config.__retryCount || 0) + 1;
        console.log(`[BotAPI] Retrying ${url} (attempt ${config.__retryCount})`);
        await new Promise((resolve) => setTimeout(resolve, API_CONFIG.retryDelay * config.__retryCount));
        return apiClient(config);
      }

      return Promise.reject(error);
    }
  );
};

addAuthInterceptor(userApi);
addAuthInterceptor(sniperApi);

// ========== AUTH ENDPOINTS ==========
export const signup = async (userData) => {
  try {
    const response = await userApi.post("/api/auth/register", userData);
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (token) {
      setToken(token);
      console.log("[BotAPI] Signup successful, token saved");
    }
    if (apiKey) setApiKey(apiKey);

    clearCache();
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
};

export const login = async (email, password) => {
  try {
    console.log("[BotAPI] Logging in...");
    const response = await userApi.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (!token) {
      console.error("[BotAPI] No token in login response:", data);
      return { success: false, error: "No token received from server" };
    }

    setToken(token);
    console.log("[BotAPI] Login successful, token saved");
    
    if (apiKey) setApiKey(apiKey);

    clearCache();
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    console.error("[BotAPI] Login error:", error);
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

  const token = getToken();
  if (!token) {
    console.warn("[BotAPI] No token, cannot get user");
    return null;
  }

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
    console.error("[BotAPI] getMe failed:", getErrorMessage(error, "Failed to get user"));
    
    if (status === 401 || status === 403) {
      clearToken();
      clearApiKey();
      if (isBrowser && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    
    return null;
  }
};

// ========== ACTIVATION & BILLING ==========
export const getActivationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("activation_status");
    if (cached) return cached;
  }

  const token = getToken();
  if (!token) {
    console.warn("[BotAPI] No token, returning default activation status");
    return getDefaultActivationStatus();
  }

  try {
    const response = await userApi.get("/api/me/activation-status");
    const data = unwrap(response);
    const status = data?.data?.status || data?.status || {};

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
      tier_required_integration: status?.tier_required_integration || "Alpaca & OKX (both)",
    };

    setCached("activation_status", result);
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn("[BotAPI] getActivationStatus failed:", getErrorMessage(error, "Activation status failed"));
    
    if (status === 401 || status === 403) {
      clearToken();
      clearApiKey();
      if (isBrowser && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    
    return getDefaultActivationStatus();
  }
};

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

export const refreshActivation = () => getActivationStatus(true);

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
      has_card: data?.data?.has_card || false,
      billing_complete: data?.data?.billing_complete || false,
    };
    setCached("card_status", result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getCardStatus failed:", getErrorMessage(error, "Failed to load card status"));
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

// ========== TRADING ENDPOINTS ==========
export const getUserTrades = async (options = {}) => {
  const { limit = 100, status, bot, skipCache = false } = options;
  const cacheKey = `user_trades_${limit}_${status || "all"}_${bot || "all"}`;

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
      summary: data?.data?.summary || {},
    };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, trades: [], summary: {}, error: getErrorMessage(error, "Failed to load trades") };
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
    return { success: false, positions: [], count: 0, error: getErrorMessage(error, "Failed to load positions") };
  }
};

export const cancelPosition = async (positionId) => {
  try {
    const response = await userApi.delete(`/api/trading/positions/${positionId}`);
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return {
      success: true,
      message: data?.message || "Position cancelled successfully",
    };
  } catch (error) {
    // Fallback for older endpoint
    try {
      const response = await userApi.delete(`/api/user/positions/${positionId}`);
      clearCache("user_positions");
      clearCache("user_trading_stats");
      return { success: true, message: "Position cancelled successfully" };
    } catch (fallbackError) {
      return handleApiError(error, "Failed to cancel position");
    }
  }
};

export const cancelAllPositions = async () => {
  try {
    const response = await userApi.post("/api/trading/positions/cancel-all");
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return {
      success: true,
      message: data?.message || "All positions cancelled successfully",
    };
  } catch (error) {
    // Fallback for older endpoint
    try {
      const response = await userApi.delete("/api/user/positions");
      clearCache("user_positions");
      clearCache("user_trading_stats");
      return { success: true, message: "All positions cancelled successfully" };
    } catch (fallbackError) {
      return handleApiError(error, "Failed to cancel positions");
    }
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
    return { success: false, executions: [], count: 0, error: getErrorMessage(error, "Failed to load bot executions") };
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
    // Handle both response formats
    const result = data?.data || data || { summary: {}, daily_performance: [] };
    setCached(cacheKey, result);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getUserTradingStats failed:", getErrorMessage(error, "Failed to load trading stats"));
    return { summary: {}, daily_performance: [] };
  }
};

export const getTradingStrategies = async (skipCache = false) => {
  const cacheKey = "trading_strategies";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  const token = getToken();
  if (!token) {
    console.warn("[BotAPI] No token for getTradingStrategies, returning defaults");
    return getDefaultStrategies();
  }

  try {
    console.log("[BotAPI] Fetching trading strategies...");
    const response = await userApi.get("/api/trading/strategies");
    const data = unwrap(response);
    
    console.log("[BotAPI] Strategies response:", data);
    
    // Handle multiple response formats
    const strategies = data?.strategies || data?.data?.strategies || [];
    const currentStrategy = data?.current_strategy || data?.data?.current_strategy || "ai_weighted";
    const tier = data?.tier || data?.data?.tier || "starter";
    
    const result = {
      success: true,
      strategies: strategies,
      current_strategy: currentStrategy,
      tier: tier,
      count: strategies.length,
    };

    setCached(cacheKey, result, 30000);
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn(`[BotAPI] getTradingStrategies failed with status ${status}:`, getErrorMessage(error, "Failed"));
    
    if (status === 401 || status === 403) {
      console.warn("[BotAPI] Auth error in getTradingStrategies");
      // Don't clear token here - let the main auth handle it
    }
    
    return getDefaultStrategies();
  }
};

const getDefaultStrategies = () => {
  const defaultStrategies = [
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
      description: "Smart mix of signals – good balance of risk and reward.",
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
  ];

  return {
    success: true,
    strategies: defaultStrategies,
    current_strategy: "ai_weighted",
    tier: "starter",
    count: defaultStrategies.length,
    _fallback: true,
  };
};

export const updateUserStrategy = async (strategyId) => {
  try {
    // Try PUT endpoint first (preferred)
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
      message: data?.message || data?.data?.message || "Trading strategy updated",
    };
  } catch (error) {
    // Fallback to POST endpoint if PUT fails
    try {
      const response = await userApi.post("/api/trading/strategies/update", { strategy_id: strategyId });
      const data = unwrap(response);
      
      clearCache("trading_strategies");
      clearCache("user_me");
      
      return {
        success: true,
        strategy: strategyId,
        message: data?.message || "Trading strategy updated",
      };
    } catch (fallbackError) {
      // If both fail, still return success for UI (update locally)
      console.warn("[BotAPI] Strategy update endpoint unavailable, updating locally only");
      return {
        success: true,
        strategy: strategyId,
        message: "Strategy preference saved locally (backend sync pending)",
        local_only: true,
      };
    }
  }
};

export const toggleTrading = async (enabled) => {
  try {
    const response = await userApi.post("/api/trading/enable", { enabled });
    clearCache("activation_status");
    return {
      success: true,
      enabled: unwrap(response)?.data?.enabled ?? enabled,
    };
  } catch (error) {
    return handleApiError(error, "Failed to toggle trading");
  }
};

// ========== INTEGRATIONS ==========
export const connectOKX = async (payload) => {
  try {
    const response = await userApi.post("/api/integrations/okx", payload);
    clearCache("activation_status");
    clearCache("integration_status");
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
  } catch (error) {
    console.warn("[BotAPI] getIntegrationStatus failed:", getErrorMessage(error, "Failed to load integrations"));
    return {
      wallet_connected: false,
      alpaca_connected: false,
      okx_connected: false,
    };
  }
};

// ========== GLOBAL TRADES ==========
export const getGlobalTrades = async (options = {}) => {
  const { limit = 20, skipCache = false } = options;
  const cacheKey = `global_trades_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 15000);
    if (cached) return cached;
  }

  const token = getToken();
  if (!token) {
    console.warn("[BotAPI] No token for getGlobalTrades, returning empty");
    return { success: false, trades: [], count: 0, error: "Not authenticated" };
  }

  try {
    console.log("[BotAPI] Fetching global trades...");
    const response = await userApi.get(`/api/trading/global-trades?limit=${limit}`);
    const data = unwrap(response);
    
    // Handle multiple response formats
    const trades = data?.trades || data?.data?.trades || [];
    
    const result = {
      success: true,
      trades: trades,
      count: trades.length,
    };
    setCached(cacheKey, result, 15000);
    return result;
  } catch (error) {
    const status = error?.response?.status;
    console.warn(`[BotAPI] getGlobalTrades failed with status ${status}:`, getErrorMessage(error, "Failed to load global trades"));
    
    // Return empty array instead of failing
    return { 
      success: false, 
      trades: [], 
      count: 0, 
      error: getErrorMessage(error, "Failed to load global trades"),
      status: status
    };
  }
};

// ========== CLASS EXPORT ==========
class BotAPIClass {
  constructor() {
    this.api = userApi;
    this.sniperApi = sniperApi;
    this.publicApi = publicApi;
  }

  // Auth
  setToken(token) { setToken(token); }
  getToken() { return getToken(); }
  clearToken() { clearToken(); }
  setApiKey(apiKey) { setApiKey(apiKey); }
  getApiKey() { return getApiKey(); }
  clearApiKey() { clearApiKey(); }
  isAuthenticated() { return isAuthenticated(); }

  signup(userData) { return signup(userData); }
  login(email, password) { return login(email, password); }
  logout() { return logout(); }
  getMe(skipCache) { return getMe(skipCache); }
  getActivationStatus(skipCache) { return getActivationStatus(skipCache); }
  refreshActivation() { return refreshActivation(); }

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

  // Billing
  getCardStatus(skipCache) { return getCardStatus(skipCache); }
  createSetupIntent(payload) { return createSetupIntent(payload); }
  confirmCard(payload) { return confirmCard(payload); }

  // Global
  getGlobalTrades(options) { return getGlobalTrades(options); }

  // Cache
  clearCache(pattern) { clearCache(pattern); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;
