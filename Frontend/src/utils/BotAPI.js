// src/utils/BotAPI.js
import axios from "axios";

// Update the API base to your HTTPS endpoint
const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com"; // ← CHANGED TO HTTPS
const TOKEN_KEY = "imali_token";

// Cache TTL settings
const CACHE_TTL_MS = 10000;
const BOTS_STATUS_CACHE_TTL_MS = 30000;

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* =========================
   TOKEN HELPERS
========================= */

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

const getStoredToken = () => safeGet(TOKEN_KEY);

const setStoredToken = (token) => {
  if (!token || typeof token !== "string") return;
  safeSet(TOKEN_KEY, token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const clearStoredToken = () => {
  safeRemove(TOKEN_KEY);
  delete api.defaults.headers.common["Authorization"];
};

/* =========================
   REQUEST DEDUPLICATION
========================= */

const inflightRequests = new Map();

const deduplicatedGet = async (url) => {
  if (inflightRequests.has(url)) {
    console.log(`[API] Dedup: reusing in-flight request for ${url}`);
    return inflightRequests.get(url);
  }

  const promise = api
    .get(url)
    .then((res) => {
      inflightRequests.delete(url);
      return res;
    })
    .catch((err) => {
      inflightRequests.delete(url);
      throw err;
    });

  inflightRequests.set(url, promise);
  return promise;
};

/* =========================
   REQUEST THROTTLE
========================= */

const lastRequestTime = new Map();
const MIN_REQUEST_GAP_MS = 3000;

const throttledGet = async (url) => {
  const now = Date.now();
  const lastTime = lastRequestTime.get(url) || 0;
  const elapsed = now - lastTime;

  if (elapsed < MIN_REQUEST_GAP_MS) {
    const waitTime = MIN_REQUEST_GAP_MS - elapsed;
    await new Promise((r) => setTimeout(r, waitTime));
  }

  lastRequestTime.set(url, Date.now());
  return deduplicatedGet(url);
};

/* =========================
   RESPONSE CACHE
========================= */

const responseCache = new Map();

const cachedGet = async (url, ttl = CACHE_TTL_MS, retryCount = 0) => {
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.time < ttl) {
    return cached.response;
  }

  try {
    const response = await throttledGet(url);
    responseCache.set(url, { response, time: Date.now() });
    return response;
  } catch (error) {
    if (error?.response?.status === 429 && retryCount < 3) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'] || '5', 10);
      const waitTime = retryAfter * 1000 || Math.pow(2, retryCount) * 2000;
      console.log(`[API] Rate limited on ${url}, waiting ${waitTime/1000}s (attempt ${retryCount + 1}/3)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return cachedGet(url, ttl, retryCount + 1);
    }
    throw error;
  }
};

setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of responseCache) {
    if (now - entry.time > CACHE_TTL_MS * 3) {
      responseCache.delete(url);
    }
  }
}, 30000);

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && typeof token === "string") {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

let redirecting = false;

const AUTH_WHITELIST = [
  "/login",
  "/signup",
  "/billing",
  "/billing-dashboard",
  "/settings/billing",
  "/activation",
  "/terms",
  "/privacy",
  "/demo",
  "/funding-guide",
  "/",
];

const getPath = () => {
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const path = getPath();
    const responseMessage = error?.response?.data?.message || "";

    if (status === 429) {
      console.warn(`[API] 429 Rate Limited on ${url} - will retry with backoff`);
      return Promise.reject(error);
    }

    if (status >= 500) {
      console.warn(`[API] ${status} Server Error on ${url}`);
      return Promise.reject(error);
    }

    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      console.warn(`[API] Network error on ${url}`);
      return Promise.reject(error);
    }

    if (status === 403) {
      console.error(`[API] 403 Forbidden on ${url}: "${responseMessage}"`);
      return Promise.reject(error);
    }

    const isLoginOrSignup =
      url.includes("/api/auth/login") || url.includes("/api/signup");

    if (status === 401 && !isLoginOrSignup) {
      clearStoredToken();

      const isWhitelisted = AUTH_WHITELIST.some((p) =>
        p === "/" ? path === "/" : path.startsWith(p)
      );

      if (!isWhitelisted && !redirecting) {
        redirecting = true;
        const next = encodeURIComponent(path);
        window.location.href = `/login?next=${next}`;
        setTimeout(() => {
          redirecting = false;
        }, 4000);
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   SAFE UNWRAP
========================= */

const unwrap = (res) => {
  if (!res) return null;
  return res.data ?? null;
};

const getErrMessage = (err, fallback = "Request failed") => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

/* =========================
   BOT TYPE CONSTANTS
========================= */

export const BOT_TYPES = {
  PAPER: "paper",
  CEX: "cex",
  STOCKS: "stocks",
  DEX: "dex",
  FUTURES: "futures"
};

export const EXCHANGE_TO_BOT_TYPE = {
  "OKX": BOT_TYPES.CEX,
  "Alpaca": BOT_TYPES.STOCKS,
  "DEX": BOT_TYPES.DEX,
  "Futures": BOT_TYPES.FUTURES
};

export const BOT_TYPE_TO_LABEL = {
  [BOT_TYPES.PAPER]: "Paper Trading",
  [BOT_TYPES.CEX]: "CEX (OKX)",
  [BOT_TYPES.STOCKS]: "Stocks (Alpaca)",
  [BOT_TYPES.DEX]: "DEX",
  [BOT_TYPES.FUTURES]: "Futures"
};

/* =========================
   API METHODS - UPDATED WITH CORRECT ENDPOINTS
========================= */

const BotAPI = {
  /* ========= TOKEN ========= */
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => !!getStoredToken(),

  clearCache() {
    responseCache.clear();
    inflightRequests.clear();
    lastRequestTime.clear();
  },

  /* ========= AUTH ========= */
  async signup(payload) {
    try {
      const res = await api.post("/api/signup", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] signup error:", error);
      throw error;
    }
  },

  async login(payload) {
    try {
      clearStoredToken();
      this.clearCache();
      const res = await api.post("/api/auth/login", payload);
      const data = unwrap(res);

      if (!data?.token) {
        throw new Error("Login failed: no token returned");
      }

      setStoredToken(data.token);
      return data;
    } catch (error) {
      console.error("[API] login error:", error);
      throw error;
    }
  },

  async me() {
    try {
      const res = await cachedGet("/api/me");
      return unwrap(res);
    } catch (error) {
      console.error("[API] me error:", error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      const res = await cachedGet("/api/me/activation-status");
      return unwrap(res);
    } catch (error) {
      if (error?.response?.status === 403) {
        try {
          const fallback1 = await cachedGet("/api/activation-status", CACHE_TTL_MS);
          return unwrap(fallback1);
        } catch (e1) {
          try {
            const fallback2 = await cachedGet("/api/user/activation-status", CACHE_TTL_MS);
            return unwrap(fallback2);
          } catch (e2) {}
        }
      }
      console.error("[API] activationStatus error:", error);
      throw error;
    }
  },

  /* ========= BILLING ========= */
  async createSetupIntent(payload) {
    try {
      const res = await api.post("/api/billing/setup-intent", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] createSetupIntent error:", error);
      throw error;
    }
  },

  async getCardStatus() {
    try {
      const res = await cachedGet("/api/billing/card-status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getCardStatus error:", error);
      throw error;
    }
  },

  async confirmCard() {
    try {
      this.clearCache();
      const res = await api.post("/api/billing/confirm-card");
      return unwrap(res);
    } catch (error) {
      console.error("[API] confirmCard error:", error);
      throw error;
    }
  },

  async setDefaultPaymentMethod(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/billing/set-default-payment", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] setDefaultPaymentMethod error:", error);
      throw error;
    }
  },

  async calculateFee(payload) {
    try {
      const res = await api.post("/api/billing/calculate-fee", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] calculateFee error:", error);
      throw error;
    }
  },

  async chargeFee(payload) {
    try {
      const res = await api.post("/api/billing/charge-fee", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] chargeFee error:", error);
      throw error;
    }
  },

  async getFeeHistory() {
    try {
      const res = await cachedGet("/api/billing/fee-history");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getFeeHistory error:", error);
      throw error;
    }
  },

  async createBillingPortal() {
    try {
      const res = await api.post("/api/billing/portal");
      return unwrap(res);
    } catch (error) {
      console.error("[API] createBillingPortal error:", error);
      throw error;
    }
  },

  /* ========= INTEGRATIONS ========= */
  async connectOKX(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/integrations/okx", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectOKX error:", error);
      throw error;
    }
  },

  async connectAlpaca(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/integrations/alpaca", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectAlpaca error:", error);
      throw error;
    }
  },

  async connectWallet(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/integrations/wallet", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectWallet error:", error);
      throw error;
    }
  },

  async getIntegrationStatus() {
    try {
      const res = await cachedGet("/api/integrations/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getIntegrationStatus error:", error);
      throw error;
    }
  },

  /* ========= TRADING ========= */
  async toggleTrading(enabled) {
    try {
      this.clearCache();
      const res = await api.post("/api/trading/enable", { enabled });
      return unwrap(res);
    } catch (error) {
      console.error("[API] toggleTrading error:", error);
      throw error;
    }
  },

  async tradingEnable(enabled) {
    return this.toggleTrading(enabled);
  },

  async getTradingStatus() {
    try {
      const res = await cachedGet("/api/trading/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getTradingStatus error:", error);
      throw error;
    }
  },

  /* ========= BOT CONTROL ========= */
  async startBot(payload = { mode: "paper" }) {
    try {
      this.clearCache();
      const res = await api.post("/api/bot/start", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] startBot error:", error);
      throw error;
    }
  },

  async stopBot(botType = null) {
    try {
      this.clearCache();
      const payload = botType ? { bot_type: botType } : {};
      const res = await api.post("/api/bot/stop", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] stopBot error:", error);
      throw error;
    }
  },

  async getBotStatus(botType = null) {
    try {
      const url = botType 
        ? `/api/bot/status?type=${botType}`
        : "/api/bot/status";
      const res = await cachedGet(url);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getBotStatus error:", error);
      return { running: false, bots: {} };
    }
  },

  async getBotsStatus() {
    try {
      // ✅ This endpoint works - we tested it!
      const res = await cachedGet("/api/bots/status", BOTS_STATUS_CACHE_TTL_MS);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getBotsStatus error:", error);
      return {
        paper: false,
        cex: false,
        stocks: false,
        dex: false,
        futures: false
      };
    }
  },

  /* ========= TRADES ========= */
  async getTrades(params = {}) {
    try {
      // ✅ Use /api/sniper/trades which we tested and works!
      const url = "/api/sniper/trades";
      const res = await cachedGet(url);
      const data = unwrap(res);
      
      return {
        trades: data?.trades || [],
        count: data?.count || 0,
        total_pnl: data?.total_pnl || 0,
        success: true
      };
    } catch (error) {
      console.error("[API] getTrades error:", error);
      return { trades: [], count: 0, success: false };
    }
  },

  async getTradesByBot(botType) {
    return this.getTrades({ botType, limit: 100 });
  },

  /* ========= BOT-SPECIFIC TRADES ========= */
  async getPaperTrades() {
    return this.getTrades();
  },

  async getCexTrades() {
    const result = await this.getTrades();
    // Filter for CEX trades (spot/futures)
    return {
      trades: result.trades.filter(t => t.bot_type === 'spot' || t.bot_type === 'futures')
    };
  },

  async getStocksTrades() {
    const result = await this.getTrades();
    return {
      trades: result.trades.filter(t => t.bot_type === 'stock')
    };
  },

  async getDexTrades() {
    const result = await this.getTrades();
    return {
      trades: result.trades.filter(t => t.bot_type === 'sniper')
    };
  },

  async getFuturesTrades() {
    const result = await this.getTrades();
    return {
      trades: result.trades.filter(t => t.bot_type === 'futures')
    };
  },

  /* ========= ANALYTICS ========= */
  async getPnLSeries(payload) {
    try {
      const res = await api.post("/api/analytics/pnl/series", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getPnLSeries error:", error);
      throw error;
    }
  },

  async getWinLossStats(payload) {
    try {
      const res = await api.post("/api/analytics/winloss", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getWinLossStats error:", error);
      throw error;
    }
  },

  async getFeeSeries(payload) {
    try {
      const res = await api.post("/api/analytics/fees/series", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getFeeSeries error:", error);
      throw error;
    }
  },

  /* ========= PROMO ========= */
  async getPromoStatus() {
    try {
      const res = await cachedGet("/api/promo/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getPromoStatus error:", error);
      throw error;
    }
  },

  async claimPromo(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/promo/claim", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] claimPromo error:", error);
      throw error;
    }
  },

  async getMyPromoStatus() {
    try {
      const res = await cachedGet("/api/promo/me");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getMyPromoStatus error:", error);
      throw error;
    }
  },

  async applyPromoCode(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/promo/apply", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] applyPromoCode error:", error);
      throw error;
    }
  },

  /* ========= REFERRALS ========= */
  async getReferralInfo() {
    try {
      const res = await cachedGet("/api/referrals/info");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getReferralInfo error:", error);
      throw error;
    }
  },

  async validateReferralCode(payload) {
    try {
      const res = await api.post("/api/referrals/validate", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] validateReferralCode error:", error);
      throw error;
    }
  },

  /* ========= WITHDRAWALS ========= */
  async createWithdrawal(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/withdrawals", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] createWithdrawal error:", error);
      throw error;
    }
  },

  async getWithdrawals() {
    try {
      const res = await cachedGet("/api/withdrawals");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getWithdrawals error:", error);
      throw error;
    }
  },

  /* ========= WAITLIST ========= */
  async joinWaitlist(payload) {
    try {
      const res = await api.post("/api/waitlist", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] joinWaitlist error:", error);
      throw error;
    }
  },

  async getWaitlistPosition(email) {
    try {
      const url = `/api/waitlist/position?email=${encodeURIComponent(email)}`;
      const res = await cachedGet(url);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getWaitlistPosition error:", error);
      throw error;
    }
  },

  /* ========= ANNOUNCEMENTS ========= */
  async getAnnouncements() {
    try {
      const res = await cachedGet("/api/announcements");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getAnnouncements error:", error);
      throw error;
    }
  },

  async markAnnouncementRead(announcementId) {
    try {
      this.clearCache();
      const res = await api.post(`/api/announcements/${announcementId}/read`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] markAnnouncementRead error:", error);
      throw error;
    }
  },

  /* ========= SUPPORT TICKETS ========= */
  async createSupportTicket(payload) {
    try {
      this.clearCache();
      const res = await api.post("/api/support/tickets", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] createSupportTicket error:", error);
      throw error;
    }
  },

  async getSupportTickets() {
    try {
      const res = await cachedGet("/api/support/tickets");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getSupportTickets error:", error);
      throw error;
    }
  },

  async getSupportTicket(ticketId) {
    try {
      const res = await cachedGet(`/api/support/tickets/${ticketId}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getSupportTicket error:", error);
      throw error;
    }
  },

  async addTicketMessage(ticketId, payload) {
    try {
      this.clearCache();
      const res = await api.post(`/api/support/tickets/${ticketId}/messages`, payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] addTicketMessage error:", error);
      throw error;
    }
  },

  /* ========= EXPORTS ========= */
  async exportTrades(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const res = await api.get(`/api/export/trades?${queryParams}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] exportTrades error:", error);
      throw error;
    }
  },

  /* ========= USER PREFERENCES ========= */
  async getPreferences() {
    try {
      const res = await cachedGet("/api/user/preferences");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getPreferences error:", error);
      throw error;
    }
  },

  async updatePreferences(payload) {
    try {
      this.clearCache();
      const res = await api.put("/api/user/preferences", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] updatePreferences error:", error);
      throw error;
    }
  },

  /* ========= ADMIN ========= */
  async adminCheck() {
    try {
      const res = await api.get("/api/admin/check");
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminCheck error:", error);
      throw error;
    }
  },

  async adminGetUsers(params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const res = await api.get(`/api/admin/users?${queryParams}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminGetUsers error:", error);
      throw error;
    }
  },

  async adminCreateUser(payload) {
    try {
      const res = await api.post("/api/admin/users/create", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminCreateUser error:", error);
      throw error;
    }
  },

  async adminUpdateUserTier(userId, tier) {
    try {
      const res = await api.patch(`/api/admin/users/${userId}/tier`, { tier });
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminUpdateUserTier error:", error);
      throw error;
    }
  },

  async adminToggleTrading(userId, enabled) {
    try {
      const res = await api.post(`/api/admin/users/${userId}/trading`, { enabled });
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminToggleTrading error:", error);
      throw error;
    }
  },

  async adminDeleteUser(userId) {
    try {
      const res = await api.delete(`/api/admin/users/${userId}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminDeleteUser error:", error);
      throw error;
    }
  },

  async adminCreatePromo(payload) {
    try {
      const res = await api.post("/api/admin/promo/create", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminCreatePromo error:", error);
      throw error;
    }
  },

  async adminListPromos() {
    try {
      const res = await api.get("/api/admin/promo/list");
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminListPromos error:", error);
      throw error;
    }
  },

  async adminGetReferralStats() {
    try {
      const res = await api.get("/api/admin/referrals/stats");
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminGetReferralStats error:", error);
      throw error;
    }
  },

  async adminGetReferralSettings() {
    try {
      const res = await api.get("/api/admin/referrals/settings");
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminGetReferralSettings error:", error);
      throw error;
    }
  },

  async adminUpdateReferralSettings(payload) {
    try {
      const res = await api.put("/api/admin/referrals/settings", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminUpdateReferralSettings error:", error);
      throw error;
    }
  },

  async adminProcessReferralPayouts(payload) {
    try {
      const res = await api.post("/api/admin/referrals/process-payouts", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] adminProcessReferralPayouts error:", error);
      throw error;
    }
  },

  /* ========= HEALTH ========= */
  async healthCheck() {
    try {
      const res = await api.get("/api/health");
      return unwrap(res);
    } catch (error) {
      console.error("[API] healthCheck error:", error);
      throw error;
    }
  },

  async detailedHealthCheck() {
    try {
      const res = await api.get("/api/health/detailed");
      return unwrap(res);
    } catch (error) {
      console.error("[API] detailedHealthCheck error:", error);
      throw error;
    }
  },

  /* ========= UTIL ========= */
  errMessage(err, fallback) {
    return getErrMessage(err, fallback);
  },
};

export { api };
export default BotAPI;
