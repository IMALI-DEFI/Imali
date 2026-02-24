// src/utils/BotAPI.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

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
   Prevents the same GET endpoint from being called
   multiple times simultaneously
========================= */

const inflightRequests = new Map();

const deduplicatedGet = async (url) => {
  // If there's already a request in-flight for this URL, return it
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
   Ensures minimum gap between requests to same endpoint
========================= */

const lastRequestTime = new Map();
const MIN_REQUEST_GAP_MS = 2000; // 2 seconds between same endpoint calls

const throttledGet = async (url) => {
  const now = Date.now();
  const lastTime = lastRequestTime.get(url) || 0;
  const elapsed = now - lastTime;

  if (elapsed < MIN_REQUEST_GAP_MS) {
    const waitTime = MIN_REQUEST_GAP_MS - elapsed;
    console.log(`[API] Throttle: waiting ${waitTime}ms before ${url}`);
    await new Promise((r) => setTimeout(r, waitTime));
  }

  lastRequestTime.set(url, Date.now());
  return deduplicatedGet(url);
};

/* =========================
   RESPONSE CACHE
   Short-lived cache for frequently requested data
========================= */

const responseCache = new Map();
const CACHE_TTL_MS = 5000; // 5-second cache

const cachedGet = async (url, ttl = CACHE_TTL_MS) => {
  const cached = responseCache.get(url);
  if (cached && Date.now() - cached.time < ttl) {
    console.log(`[API] Cache hit: ${url} (age: ${Date.now() - cached.time}ms)`);
    return cached.response;
  }

  const response = await throttledGet(url);

  responseCache.set(url, {
    response,
    time: Date.now(),
  });

  return response;
};

// Clear stale cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [url, entry] of responseCache) {
    if (now - entry.time > CACHE_TTL_MS * 2) {
      responseCache.delete(url);
    }
  }
}, 10000);

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

    if (process.env.NODE_ENV === "development") {
      console.log(`[API] → ${config.method?.toUpperCase()} ${config.url}`);
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

    // 429 — rate limited: log clearly, never redirect, never clear token
    if (status === 429) {
      console.warn(
        `[API] 429 Rate Limited on ${url}`,
        "— Too many requests. The app will retry automatically."
      );
      return Promise.reject(error);
    }

    // 5xx — server errors
    if (status >= 500) {
      console.warn(`[API] ${status} Server Error on ${url}`);
      return Promise.reject(error);
    }

    // Network errors
    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      console.warn(`[API] Network error on ${url}`);
      return Promise.reject(error);
    }

    // 403 — Forbidden: user IS authenticated but lacks permission
    // DO NOT clear token — this is NOT a session expiry
    if (status === 403) {
      console.error(
        `[API] 403 Forbidden on ${url}: "${responseMessage}"`,
        "\n→ User is authenticated but endpoint requires higher permissions.",
        "\n→ If this is /api/me/* endpoint, the backend route has adminMiddleware by mistake."
      );
      return Promise.reject(error);
    }

    // 401 — Unauthorized: session expired or bad token
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
   API METHODS
========================= */

const BotAPI = {
  /* ========= TOKEN ========= */
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => !!getStoredToken(),

  // Utility: clear all caches (useful after mutations)
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
      this.clearCache(); // Fresh start after login
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
      // If 403, try fallback endpoints
      if (error?.response?.status === 403) {
        console.warn(
          "[API] 403 on /api/me/activation-status — trying fallback endpoints"
        );

        // Try /api/activation-status
        try {
          const fallback1 = await throttledGet("/api/activation-status");
          return unwrap(fallback1);
        } catch (e1) {
          console.warn("[API] Fallback /api/activation-status failed:", e1?.response?.status);
        }

        // Try /api/user/activation-status
        try {
          const fallback2 = await throttledGet("/api/user/activation-status");
          return unwrap(fallback2);
        } catch (e2) {
          console.warn("[API] Fallback /api/user/activation-status failed:", e2?.response?.status);
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
      this.clearCache(); // Mutation — clear cache
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

  async getTradingStatus() {
    try {
      const res = await cachedGet("/api/trading/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getTradingStatus error:", error);
      throw error;
    }
  },

  /* ========= BOT ========= */
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

  /* ========= TRADES ========= */
  async getTrades() {
    try {
      // Use cached + throttled GET to prevent 429
      const res = await cachedGet("/api/sniper/trades");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getTrades error:", error);
      throw error;
    }
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
      const res = await api.post(
        `/api/support/tickets/${ticketId}/messages`,
        payload
      );
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
      const res = await api.post(`/api/admin/users/${userId}/trading`, {
        enabled,
      });
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
      const res = await api.post(
        "/api/admin/referrals/process-payouts",
        payload
      );
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
