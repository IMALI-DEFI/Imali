// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = (
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_URL ||
  "https://api.imali-defi.com"
).replace(/\/+$/, "");

const TOKEN_KEYS = ["imali_token", "token"];

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

const cache = new Map();

const getToken = () => {
  for (const key of TOKEN_KEYS) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }
  return null;
};

const setToken = (token) => {
  localStorage.setItem("imali_token", token);
  localStorage.setItem("token", token);
};

const clearToken = () => {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
};

const unwrap = (res) => res?.data || res;

const getData = (res) => {
  const row = unwrap(res);
  return row?.data || row || {};
};

const money = (value) => {
  const n = Number(String(value ?? 0).replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const bool = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  return false;
};

const mode = (value) => {
  return String(value || "paper").toLowerCase() === "live" ? "live" : "paper";
};

const clearCache = () => cache.clear();

const cachedGet = async (key, ttl, fn, skipCache = false) => {
  const hit = cache.get(key);
  if (!skipCache && hit && Date.now() - hit.time < ttl) {
    return hit.value;
  }
  const value = await fn();
  cache.set(key, { value, time: Date.now() });
  return value;
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      "Request failed";
    return Promise.reject({ ...error, message, status: error?.response?.status });
  }
);

// =====================================================
// AUTH
// =====================================================
const login = async (email, password) => {
  const res = await api.post("/api/auth/login", { email, password });
  const data = getData(res);
  if (data?.token) {
    setToken(data.token);
    localStorage.setItem("imali_user", JSON.stringify(data.user || {}));
  }
  return unwrap(res);
};

const logout = () => {
  clearToken();
  localStorage.removeItem("imali_user");
  clearCache();
};

const isAuthenticated = () => !!getToken();

const getMe = async (skipCache = false) =>
  cachedGet("me", 15000, async () => getData(await api.get("/api/me"))?.user || getData(await api.get("/api/me")), skipCache);

// =====================================================
// USER / BILLING - FIXED
// =====================================================
const getActivationStatus = async (skipCache = false) =>
  cachedGet("activation", 15000, async () => {
    const data = getData(await api.get("/api/me/activation-status"));
    // Handle both response formats
    return data?.status || data || {};
  }, skipCache);

const getTrialStatus = async (skipCache = false) =>
  cachedGet("trial", 15000, async () => getData(await api.get("/api/me/trial-status")), skipCache);

// FIXED: Get card status - returns { has_card, billing_complete }
const getCardStatus = async (skipCache = false) =>
  cachedGet("card", 15000, async () => {
    const response = await api.get("/api/billing/card-status");
    const data = getData(response);
    // Your API returns: { success: true, data: { has_card, billing_complete } }
    // getData extracts the inner data object
    return {
      has_card: !!data?.has_card,
      billing_complete: !!data?.billing_complete,
      // Include the raw data for debugging
      _raw: data
    };
  }, skipCache);

// FIXED: Helper to check if card exists - ONLY uses has_card
const hasValidCard = async (skipCache = false) => {
  const status = await getCardStatus(skipCache);
  return !!status?.has_card;
};

// FIXED: Get card status with proper error handling
const getCardStatusSafe = async (skipCache = false) => {
  try {
    const status = await getCardStatus(skipCache);
    return {
      success: true,
      hasCard: !!status?.has_card,
      billingComplete: !!status?.billing_complete,
      // IMPORTANT: billingComplete is NOT used to determine if a card exists
      data: status
    };
  } catch (error) {
    console.error('Error fetching card status:', error);
    return {
      success: false,
      hasCard: false,
      billingComplete: false,
      error: error.message
    };
  }
};

const createSetupIntent = async (payload = {}) =>
  unwrap(await api.post("/api/billing/setup-intent", payload));

const confirmCard = async (setup_intent_id) =>
  unwrap(await api.post("/api/billing/confirm-card", { setup_intent_id }));

// FIXED: Change plan with proper billing model
const changePlan = async (tier, billingModel = "fixed", profitSharePct = null) => {
  const res = unwrap(await api.post("/api/change-plan", { 
    tier, 
    billing_model: billingModel, 
    profit_share_pct: profitSharePct 
  }));
  clearCache();
  return res;
};

// FIXED: Cancel subscription
const cancelSubscription = async () => {
  const res = unwrap(await api.post("/api/billing/cancel-subscription"));
  clearCache();
  return res;
};

// NEW: Remove card endpoint
const removeCard = async () => {
  const res = unwrap(await api.post("/api/billing/remove-card"));
  clearCache();
  return res;
};

// NEW: Get subscription details
const getSubscriptionDetails = async (skipCache = false) =>
  cachedGet("subscription", 15000, async () => {
    try {
      const data = getData(await api.get("/api/billing/subscription"));
      return data || {};
    } catch {
      return { error: "Failed to fetch subscription details" };
    }
  }, skipCache);

// NEW: Sync billing with Stripe
const syncBilling = async () => {
  const res = unwrap(await api.post("/api/billing/sync"));
  clearCache();
  return res;
};

// =====================================================
// INTEGRATIONS
// =====================================================
const getIntegrationStatus = async (skipCache = false) =>
  cachedGet("integrations", 10000, async () => {
    const d = getData(await api.get("/api/integrations/status"));
    return {
      wallet_connected: bool(d.wallet_connected),
      wallet_address_masked: d.wallet_address_masked || "",
      okx_connected: bool(d.okx_connected),
      okx_api_key_masked: d.okx_api_key_masked || "",
      okx_mode: mode(d.okx_mode),
      okx_key_updated_at: d.okx_key_updated_at || null,
      alpaca_connected: bool(d.alpaca_connected),
      alpaca_api_key_masked: d.alpaca_api_key_masked || "",
      alpaca_mode: mode(d.alpaca_mode),
      alpaca_key_updated_at: d.alpaca_key_updated_at || null,
    };
  }, skipCache);

const connectOKX = async (payload = {}) => {
  const body = {
    api_key: payload.api_key || payload.apiKey,
    secret_key: payload.secret_key || payload.secretKey || payload.secret,
    passphrase: payload.passphrase,
    mode: mode(payload.mode),
  };
  const res = unwrap(await api.post("/api/integrations/okx", body));
  clearCache();
  return res;
};

const disconnectOKX = async () => {
  const res = unwrap(await api.delete("/api/integrations/okx"));
  clearCache();
  return res;
};

const connectAlpaca = async (payload = {}) => {
  const body = {
    api_key: payload.api_key || payload.apiKey,
    secret_key: payload.secret_key || payload.secretKey || payload.secret,
    mode: mode(payload.mode),
  };
  const res = unwrap(await api.post("/api/integrations/alpaca", body));
  clearCache();
  return res;
};

const disconnectAlpaca = async () => {
  const res = unwrap(await api.delete("/api/integrations/alpaca"));
  clearCache();
  return res;
};

const switchExchangeMode = async (exchange, newMode) => {
  const ex = String(exchange || "okx").toLowerCase();
  if (newMode === "live") {
    const res = unwrap(await api.post(`/api/integrations/${ex}/live`));
    clearCache();
    return res;
  }
  return { success: false, error: "Paper mode switch endpoint is not implemented on backend yet." };
};

const switchOKXToLive = () => switchExchangeMode("okx", "live");
const switchAlpacaToLive = () => switchExchangeMode("alpaca", "live");

// =====================================================
// BALANCE / PORTFOLIO
// =====================================================
const getExchangeBalance = async (skipCache = false) =>
  cachedGet("exchange_balance", 7000, async () => {
    const d = getData(await api.get("/api/exchanges/balance"));
    return {
      success: true,
      okx: money(d.okx ?? d.okx_total),
      okx_total: money(d.okx ?? d.okx_total),
      okx_available_usdt: money(d.okx_available_usdt),
      okx_assets: Array.isArray(d.okx_assets) ? d.okx_assets : [],
      alpaca: money(d.alpaca ?? d.alpaca_total),
      alpaca_total: money(d.alpaca ?? d.alpaca_total),
      alpaca_available_usd: money(d.alpaca_available_usd ?? d.alpaca_available_usdt),
      alpaca_assets: Array.isArray(d.alpaca_assets) ? d.alpaca_assets : [],
      total: money(d.total),
    };
  }, skipCache);

const getPortfolioSummary = async (_category = "spot", skipCache = false) => {
  const bal = await getExchangeBalance(skipCache);
  return {
    success: true,
    data: {
      total: bal.total || bal.okx_total || bal.alpaca_total,
      currencies: [...(bal.okx_assets || []), ...(bal.alpaca_assets || [])],
      topHoldings: [...(bal.okx_assets || []), ...(bal.alpaca_assets || [])],
    },
  };
};

// =====================================================
// BOT
// =====================================================
const getTradingBotStatus = async (skipCache = false) =>
  cachedGet("bot_status", 3000, async () => {
    const raw = getData(await api.get("/api/trading/bot/status"));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
    const bots = list.map((b) => ({
      ...b,
      botId: b.botId || b.bot_id,
      isRunning: bool(b.isRunning) || String(b.status || "").toLowerCase() === "running",
      mode: mode(b.mode),
      exchange: String(b.exchange || "okx").toLowerCase(),
      strategy: b.strategy || "ai_weighted",
    }));
    return {
      success: true,
      data: bots,
      bots,
      activeBot: bots.find((b) => b.isRunning) || bots[0] || null,
      isRunning: bots.some((b) => b.isRunning),
    };
  }, skipCache);

const startTradingBot = async (exchange = "okx", strategy = "ai_weighted", runMode = "paper", category = null, config = {}) => {
  const res = unwrap(await api.post("/api/trading/bot/start", {
    exchange, strategy, mode: mode(runMode), category,
    takeProfitPct: config.takeProfitPct,
    stopLossPct: config.stopLossPct,
    maxTradeAmount: config.maxTradeAmount,
  }));
  clearCache();
  return res;
};

const stopTradingBot = async (exchange = "okx") => {
  const res = unwrap(await api.post("/api/trading/bot/stop", { exchange }));
  clearCache();
  return res;
};

const startTradingBotByCategory = async (category, strategy, runMode = "paper") => {
  const map = { spot: "okx", crypto: "okx", futures: "okx", stocks: "alpaca", dex: "wallet" };
  return startTradingBot(map[category] || "okx", strategy, runMode, category);
};

const stopTradingBotByCategory = async (category) => {
  const map = { spot: "okx", crypto: "okx", futures: "okx", stocks: "alpaca", dex: "wallet" };
  return stopTradingBot(map[category] || "okx");
};

// =====================================================
// STRATEGIES
// =====================================================
const getStrategyConfigs = async (skipCache = false) =>
  cachedGet("strategy_configs", 30000, async () => {
    try {
      return unwrap(await api.get("/api/trading/strategies/config"));
    } catch {
      return {
        success: true,
        data: {
          mean_reversion: { name: "Conservative", maxPositions: 3, tradePct: 0.1, takeProfitPct: 0.025, stopLossPct: 0.025, riskLevel: "low", description: "Slow, steady trades focused on consistency" },
          ai_weighted: { name: "Balanced AI", maxPositions: 5, tradePct: 0.12, takeProfitPct: 0.025, stopLossPct: 0.025, riskLevel: "medium", description: "AI-assisted balance between growth and protection" },
          momentum: { name: "Growth", maxPositions: 6, tradePct: 0.14, takeProfitPct: 0.025, stopLossPct: 0.025, riskLevel: "higher", description: "Faster opportunities with larger swings" },
          aggressive: { name: "Aggressive", maxPositions: 8, tradePct: 0.15, takeProfitPct: 0.025, stopLossPct: 0.025, riskLevel: "high", description: "High volatility with larger upside potential" },
        },
      };
    }
  }, skipCache);

const getTradingStrategies = async (skipCache = false) =>
  cachedGet("strategies", 30000, async () => unwrap(await api.get("/api/trading/strategies")), skipCache);

const updateUserStrategy = async (strategy) =>
  unwrap(await api.put("/api/user/strategy", { strategy }));

// =====================================================
// STATS / TRADES
// =====================================================
const getLiveTradingStats = async (exchange = "okx", skipCache = false) =>
  cachedGet(`live_stats_${exchange}`, 7000, async () => {
    const d = getData(await api.get(`/api/trading/live-stats?exchange=${exchange}`));
    return { success: true, summary: d.summary || d, data: d };
  }, skipCache);

const getOpenPositions = async (exchange = "okx", skipCache = false) =>
  cachedGet(`positions_${exchange}`, 7000, async () => {
    const d = getData(await api.get(`/api/trading/open-positions?exchange=${exchange}`));
    return { success: true, positions: d.positions || [], data: d };
  }, skipCache);

const getLiveTradeHistory = async (limit = 20, exchange = "okx", skipCache = false) =>
  cachedGet(`live_trades_${exchange}_${limit}`, 7000, async () => {
    const d = getData(await api.get(`/api/trading/live-trades?limit=${limit}&exchange=${exchange}`));
    return { success: true, trades: d.trades || [], data: d };
  }, skipCache);

const getUserTradingStats = async (days = 30) =>
  unwrap(await api.get(`/api/user/trading-stats?days=${days}`));

const getRealTradingStats = async (days = 30) =>
  unwrap(await api.get(`/api/user/real-trading-stats?days=${days}`));

const executePaperTrade = async (tradeData) =>
  unwrap(await api.post("/api/trading/paper-trade", tradeData));

const closePosition = async (positionId) => {
  const res = unwrap(await api.delete(`/api/trading/positions/${positionId}`));
  clearCache();
  return res;
};

const closeAllPositions = async (exchange = "okx") => {
  const res = unwrap(await api.post("/api/trading/positions/close-all", { exchange }));
  clearCache();
  return res;
};

// =====================================================
// TOGGLES
// =====================================================
const toggleTrading = async (enabled, confirmed = true) =>
  unwrap(await api.post("/api/trading/enable", { enabled, confirmed }));

const togglePaperTrading = async (enabled) =>
  unwrap(await api.patch("/api/user/paper-trading", { enabled }));

// =====================================================
// IMALI TOKEN / DISCOUNTS
// =====================================================
const getImaliBalance = async () => {
  try { return unwrap(await api.get("/api/wallet/imali-balance")); }
  catch { return { success: false, balance: 0 }; }
};

const getImaliDiscountStatus = async () => {
  try { return unwrap(await api.get("/api/billing/imali-discount-status")); }
  catch { return { success: false, discountPct: 0, active: false }; }
};

const applyImaliDiscount = async () => {
  try { return unwrap(await api.post("/api/billing/apply-imali-discount")); }
  catch (error) { return { success: false, error: error.message }; }
};

const getGlobalTrades = async (options = {}) =>
  unwrap(await api.get("/api/trading/global-trades", { params: options }));

// =====================================================
// EXPORT - FIXED with billing helpers
// =====================================================
const BotAPI = {
  // Core
  api, getToken, setToken, clearToken, clearCache, isAuthenticated,
  
  // Auth
  login, logout, getMe,
  
  // Billing - FIXED
  getActivationStatus, 
  getTrialStatus, 
  getCardStatus, 
  getCardStatusSafe,  // NEW - safer version with error handling
  hasValidCard,       // NEW - simple boolean check
  createSetupIntent, 
  confirmCard, 
  changePlan, 
  cancelSubscription,
  removeCard,         // NEW
  getSubscriptionDetails, // NEW
  syncBilling,        // NEW
  
  // Integrations
  getIntegrationStatus, 
  connectOKX, 
  disconnectOKX, 
  connectAlpaca, 
  disconnectAlpaca, 
  switchExchangeMode, 
  switchOKXToLive, 
  switchAlpacaToLive,
  
  // Balance
  getExchangeBalance, 
  getPortfolioSummary,
  
  // Bot
  getTradingBotStatus, 
  startTradingBot, 
  stopTradingBot, 
  startTradingBotByCategory, 
  stopTradingBotByCategory,
  
  // Strategies
  getStrategyConfigs, 
  getTradingStrategies, 
  updateUserStrategy,
  
  // Stats
  getLiveTradingStats, 
  getOpenPositions, 
  getLiveTradeHistory, 
  getUserTradingStats, 
  getRealTradingStats, 
  executePaperTrade, 
  closePosition, 
  closeAllPositions,
  
  // Toggles
  toggleTrading, 
  togglePaperTrading,
  
  // Imali Token
  getImaliBalance, 
  getImaliDiscountStatus, 
  applyImaliDiscount,
  
  // Global
  getGlobalTrades,
};

export default BotAPI;
