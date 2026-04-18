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
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

export const clearToken = () => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
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

export const isAuthenticated = () => !!getToken();

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

      if (!response && config && !config.__retryCount) {
        config.__retryCount = 1;
        await new Promise((resolve) => setTimeout(resolve, API_CONFIG.retryDelay));
        return apiClient(config);
      }

      if (status === 401) {
        const isAuthPage =
          isBrowser &&
          (window.location.pathname.includes("/login") ||
            window.location.pathname.includes("/signup"));

        if (!isAuthPage && shouldForceLogout(url)) {
          clearToken();
          clearApiKey();
          clearCache();
          if (isBrowser) window.location.href = "/login?expired=true";
        } else {
          console.warn("[BotAPI] Ignoring non-session 401:", url);
        }
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

    if (token) setToken(token);
    if (apiKey) setApiKey(apiKey);

    clearCache();
    return { success: true, data, token, api_key: apiKey };
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
};

export const login = async (email, password) => {
  try {
    const response = await userApi.post("/api/auth/login", { email, password });
    const data = unwrap(response);
    const token = data?.data?.token || data?.token;
    const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

    if (token) setToken(token);
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

export const getMe = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("user_me");
    if (cached) return cached;
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
    console.error("[BotAPI] getMe failed:", getErrorMessage(error, "Failed to get user"));
    return null;
  }
};

// ========== ACTIVATION & BILLING ==========
export const getActivationStatus = async (skipCache = false) => {
  if (!skipCache) {
    const cached = getCached("activation_status");
    if (cached) return cached;
  }

  try {
    const response = await userApi.get("/api/me/activation-status");
    const data = unwrap(response);
    const status = data?.data?.status || {};

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
    console.warn("[BotAPI] getActivationStatus failed:", getErrorMessage(error, "Activation status failed"));
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
      tier_required_integration: "Alpaca & OKX (both)",
    };
  }
};

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
    const response = await userApi.delete(`/api/user/positions/${positionId}`);
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return {
      success: true,
      message: data?.message || "Position cancelled successfully",
    };
  } catch (error) {
    return handleApiError(error, "Failed to cancel position");
  }
};

export const cancelAllPositions = async () => {
  try {
    const response = await userApi.delete("/api/user/positions");
    const data = unwrap(response);
    clearCache("user_positions");
    clearCache("user_trading_stats");
    return {
      success: true,
      message: data?.message || "All positions cancelled successfully",
    };
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
    const result = data?.data || { summary: {}, daily_performance: [] };
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

  try {
    const response = await userApi.get("/api/trading/strategies");
    const data = unwrap(response);
    const payload = data?.data || {};

    const result = {
      success: true,
      strategies: payload?.strategies || [],
      current_strategy: payload?.current_strategy || "ai_weighted",
      tier: payload?.tier || "starter",
      count: payload?.count || 0,
    };

    setCached(cacheKey, result, 30000);
    return result;
  } catch (error) {
    const result = {
      success: false,
      strategies: [
        {
          id: "ai_weighted",
          name: "Smart Signal Mode",
          backend_name: "AI Weighted",
          description: "Lets the system weigh signals and choose stronger setups for you.",
          risk_level: "medium",
          min_investment: 100,
          expected_apy: "15-25%",
          is_default: true,
        },
      ],
      current_strategy: "ai_weighted",
      tier: "starter",
      count: 1,
      error: getErrorMessage(error, "Failed to load trading strategies"),
      status: error?.response?.status,
    };

    console.warn("[BotAPI] getTradingStrategies failed without forcing logout:", result.error);
    return result;
  }
};

export const updateUserStrategy = async (strategy) => {
  try {
    const response = await userApi.put("/api/user/strategy", { strategy });
    const data = unwrap(response);
    const payload = data?.data || {};

    clearCache("trading_strategies");
    clearCache("user_me");
    clearCache("user_positions");
    clearCache("user_bot_executions");
    clearCache("user_trading_stats");

    return {
      success: true,
      strategy: payload?.strategy || strategy,
      strategy_name: payload?.strategy_name || strategy,
      tier: payload?.tier || null,
      allowed_strategies: payload?.allowed_strategies || [],
      message: payload?.message || "Trading strategy updated",
    };
  } catch (error) {
    return handleApiError(error, "Failed to update strategy");
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

// ========== REFERRAL ENDPOINTS (LIVE & COMPLETE) ==========

// Get user's referral information (code, earnings, stats)
export const getReferralInfo = async (skipCache = false) => {
  const cacheKey = "referral_info";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await userApi.get("/api/referral/info");
    const data = unwrap(response);
    const result = {
      success: true,
      data: {
        code: data?.data?.code || "",
        total_referred: data?.data?.total_referred || 0,
        earned: data?.data?.earned || 0,
        paid_out: data?.data?.paid_out || 0,
        pending: data?.data?.pending || 0,
        reward_percentage: data?.data?.reward_percentage || 20,
        reward_currency: data?.data?.reward_currency || "USDC",
        qualified_referrals: data?.data?.qualified_referrals || 0,
        nft_tier: data?.data?.nft_tier || "Starter Referral NFT",
      },
    };
    setCached(cacheKey, result.data, 30000);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralInfo failed:", getErrorMessage(error, "Failed to load referral info"));
    return {
      success: false,
      data: {
        code: "",
        total_referred: 0,
        earned: 0,
        paid_out: 0,
        pending: 0,
        reward_percentage: 20,
        reward_currency: "USDC",
        qualified_referrals: 0,
        nft_tier: "Starter Referral NFT",
      },
      error: getErrorMessage(error, "Failed to load referral info"),
    };
  }
};

// Get detailed referral statistics (level 1, level 2 earnings, etc.)
export const getReferralStats = async (skipCache = false) => {
  const cacheKey = "referral_stats";

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await userApi.get("/api/referral/stats");
    const data = unwrap(response);
    const result = {
      success: true,
      data: {
        total_rewards_earned: data?.data?.total_rewards_earned || 0,
        pending_rewards: data?.data?.pending_rewards || 0,
        qualified_referrals: data?.data?.qualified_referrals || 0,
        reward_percentage: data?.data?.reward_percentage || 20,
        level1_earnings: data?.data?.level1_earnings || 0,
        level2_earnings: data?.data?.level2_earnings || 0,
        total_referrals: data?.data?.total_referrals || 0,
      },
    };
    setCached(cacheKey, result.data, 30000);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralStats failed:", getErrorMessage(error, "Failed to load referral stats"));
    return {
      success: false,
      data: {
        total_rewards_earned: 0,
        pending_rewards: 0,
        qualified_referrals: 0,
        reward_percentage: 20,
        level1_earnings: 0,
        level2_earnings: 0,
        total_referrals: 0,
      },
      error: getErrorMessage(error, "Failed to load referral stats"),
    };
  }
};

// Validate a referral code (check if it exists and is valid)
export const validateReferralCode = async (code) => {
  try {
    const response = await userApi.get(`/api/referral/validate/${encodeURIComponent(code)}`);
    const data = unwrap(response);
    return {
      success: true,
      valid: true,
      message: data?.message || "Referral code is valid",
      referrer_name: data?.data?.referrer_name,
      referrer_code: data?.data?.referrer_code,
    };
  } catch (error) {
    const message = getErrorMessage(error, "Referral code is invalid");
    return {
      success: false,
      valid: false,
      error: message,
      message,
    };
  }
};

// Apply a referral code to the current user's account
export const applyReferralCode = async (code) => {
  try {
    const response = await userApi.post("/api/referral/apply", { code: code.toUpperCase() });
    const data = unwrap(response);
    clearCache("referral_info");
    clearCache("referral_stats");
    clearCache("user_me");
    return {
      success: true,
      applied: true,
      message: data?.message || "Referral code applied successfully! You'll both earn rewards.",
      data: data?.data,
    };
  } catch (error) {
    return handleApiError(error, "Failed to apply referral code");
  }
};

// Claim pending referral rewards
export const claimReferralRewards = async (amount, walletAddress, options = {}) => {
  const { skipCacheClear = false } = options;
  
  try {
    const response = await userApi.post("/api/referral/claim", {
      amount: parseFloat(amount),
      wallet_address: walletAddress,
    });
    const data = unwrap(response);
    
    if (!skipCacheClear) {
      clearCache("referral_info");
      clearCache("referral_stats");
      clearCache("user_me");
    }
    
    return {
      success: true,
      id: data?.data?.id,
      tx_hash: data?.data?.tx_hash,
      amount: data?.data?.amount,
      status: data?.data?.status || "completed",
      message: data?.message || "Rewards claimed successfully!",
    };
  } catch (error) {
    return handleApiError(error, "Failed to claim rewards");
  }
};

// Get referral leaderboard (top referrers)
export const getReferralLeaderboard = async (limit = 20, skipCache = false) => {
  const cacheKey = `referral_leaderboard_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 60000);
    if (cached) return cached;
  }

  try {
    const response = await publicApi.get(`/api/referral/leaderboard?limit=${limit}`);
    const data = unwrap(response);
    const result = {
      success: true,
      leaderboard: data?.data?.leaderboard || [],
      total_referrers: data?.data?.total_referrers || 0,
    };
    setCached(cacheKey, result, 60000);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralLeaderboard failed:", getErrorMessage(error, "Failed to load leaderboard"));
    return {
      success: false,
      leaderboard: [],
      total_referrers: 0,
      error: getErrorMessage(error, "Failed to load leaderboard"),
    };
  }
};

// Get referral transactions history
export const getReferralTransactions = async (limit = 50, skipCache = false) => {
  const cacheKey = `referral_transactions_${limit}`;

  if (!skipCache) {
    const cached = getCached(cacheKey, 30000);
    if (cached) return cached;
  }

  try {
    const response = await userApi.get(`/api/referral/transactions?limit=${limit}`);
    const data = unwrap(response);
    const result = {
      success: true,
      transactions: data?.data?.transactions || [],
      total: data?.data?.total || 0,
    };
    setCached(cacheKey, result, 30000);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getReferralTransactions failed:", getErrorMessage(error, "Failed to load transactions"));
    return {
      success: false,
      transactions: [],
      total: 0,
      error: getErrorMessage(error, "Failed to load transactions"),
    };
  }
};

// Generate a new referral code (for wallet users)
export const generateReferralCode = async () => {
  try {
    const response = await userApi.post("/api/referral/generate-code");
    const data = unwrap(response);
    clearCache("referral_info");
    clearCache("user_me");
    return {
      success: true,
      code: data?.data?.code,
      message: data?.message || "Referral code generated successfully",
    };
  } catch (error) {
    return handleApiError(error, "Failed to generate referral code");
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

  try {
    const response = await publicApi.get(`/api/trades/global?limit=${limit}`);
    const data = unwrap(response);
    const result = {
      success: true,
      trades: data?.data?.trades || [],
      count: data?.data?.count || 0,
    };
    setCached(cacheKey, result, 15000);
    return result;
  } catch (error) {
    console.warn("[BotAPI] getGlobalTrades failed:", getErrorMessage(error, "Failed to load global trades"));
    return { success: false, trades: [], count: 0, error: getErrorMessage(error, "Failed to load global trades") };
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

  // Referral (COMPLETE & LIVE)
  getReferralInfo(skipCache) { return getReferralInfo(skipCache); }
  getReferralStats(skipCache) { return getReferralStats(skipCache); }
  validateReferralCode(code) { return validateReferralCode(code); }
  applyReferralCode(code) { return applyReferralCode(code); }
  claimReferralRewards(amount, walletAddress, options) { return claimReferralRewards(amount, walletAddress, options); }
  getReferralLeaderboard(limit, skipCache) { return getReferralLeaderboard(limit, skipCache); }
  getReferralTransactions(limit, skipCache) { return getReferralTransactions(limit, skipCache); }
  generateReferralCode() { return generateReferralCode(); }

  // Global
  getGlobalTrades(options) { return getGlobalTrades(options); }

  // Cache
  clearCache(pattern) { clearCache(pattern); }
}

const BotAPI = new BotAPIClass();
export default BotAPI;