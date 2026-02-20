// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
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
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && typeof token === "string") {
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
  "/activation",
  "/terms",
  "/privacy",
  "/trade-demo",
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

    // 429 — pass through for retry logic, never redirect
    if (status === 429) {
      console.warn(`[API] Rate limited on ${url}`);
      return Promise.reject(error);
    }

    // 5xx — server errors, never redirect or clear token
    if (status >= 500) {
      console.warn(`[API] Server error ${status} on ${url}`);
      return Promise.reject(error);
    }

    // Network errors — never redirect or clear token
    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      console.warn(`[API] Network error on ${url}`);
      return Promise.reject(error);
    }

    // 401 — actual auth failure
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/signup") ||
      url.includes("/api/me") ||
      url.includes("/api/me/activation-status");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();

      const isWhitelisted = AUTH_WHITELIST.some((p) =>
        path.startsWith(p)
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
      const res = await api.get("/api/me");
      return unwrap(res);
    } catch (error) {
      console.error("[API] me error:", error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      const res = await api.get("/api/me/activation-status");
      return unwrap(res);
    } catch (error) {
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
      const res = await api.get("/api/billing/card-status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getCardStatus error:", error);
      throw error;
    }
  },

  /**
   * Confirm card after successful Stripe setup
   * This tells the backend to verify with Stripe and update billing_complete
   */
  async confirmCard() {
    try {
      const res = await api.post("/api/billing/confirm-card");
      return unwrap(res);
    } catch (error) {
      console.error("[API] confirmCard error:", error);
      throw error;
    }
  },

  async setDefaultPaymentMethod(payload) {
    try {
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
      const res = await api.get("/api/billing/fee-history");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getFeeHistory error:", error);
      throw error;
    }
  },

  /* ========= INTEGRATIONS ========= */
  async connectOKX(payload) {
    try {
      const res = await api.post("/api/integrations/okx", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectOKX error:", error);
      throw error;
    }
  },

  async connectAlpaca(payload) {
    try {
      const res = await api.post("/api/integrations/alpaca", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectAlpaca error:", error);
      throw error;
    }
  },

  async connectWallet(payload) {
    try {
      const res = await api.post("/api/integrations/wallet", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] connectWallet error:", error);
      throw error;
    }
  },

  async getIntegrationStatus() {
    try {
      const res = await api.get("/api/integrations/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getIntegrationStatus error:", error);
      throw error;
    }
  },

  /* ========= TRADING ========= */
  async toggleTrading(enabled) {
    try {
      const res = await api.post("/api/trading/enable", { enabled });
      return unwrap(res);
    } catch (error) {
      console.error("[API] toggleTrading error:", error);
      throw error;
    }
  },

  async getTradingStatus() {
    try {
      const res = await api.get("/api/trading/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getTradingStatus error:", error);
      throw error;
    }
  },

  /* ========= BOT ========= */
  async startBot(payload = { mode: "paper" }) {
    try {
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
      const res = await api.get("/api/sniper/trades");
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
      const res = await api.get("/api/promo/status");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getPromoStatus error:", error);
      throw error;
    }
  },

  async claimPromo(payload) {
    try {
      const res = await api.post("/api/promo/claim", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] claimPromo error:", error);
      throw error;
    }
  },

  async getMyPromoStatus() {
    try {
      const res = await api.get("/api/promo/me");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getMyPromoStatus error:", error);
      throw error;
    }
  },

  async applyPromoCode(payload) {
    try {
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
      const res = await api.get("/api/referrals/info");
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
      const res = await api.post("/api/withdrawals", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] createWithdrawal error:", error);
      throw error;
    }
  },

  async getWithdrawals() {
    try {
      const res = await api.get("/api/withdrawals");
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
      const res = await api.get(`/api/waitlist/position?email=${encodeURIComponent(email)}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getWaitlistPosition error:", error);
      throw error;
    }
  },

  /* ========= ANNOUNCEMENTS ========= */
  async getAnnouncements() {
    try {
      const res = await api.get("/api/announcements");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getAnnouncements error:", error);
      throw error;
    }
  },

  async markAnnouncementRead(announcementId) {
    try {
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
      const res = await api.post("/api/support/tickets", payload);
      return unwrap(res);
    } catch (error) {
      console.error("[API] createSupportTicket error:", error);
      throw error;
    }
  },

  async getSupportTickets() {
    try {
      const res = await api.get("/api/support/tickets");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getSupportTickets error:", error);
      throw error;
    }
  },

  async getSupportTicket(ticketId) {
    try {
      const res = await api.get(`/api/support/tickets/${ticketId}`);
      return unwrap(res);
    } catch (error) {
      console.error("[API] getSupportTicket error:", error);
      throw error;
    }
  },

  async addTicketMessage(ticketId, payload) {
    try {
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
      const res = await api.get("/api/user/preferences");
      return unwrap(res);
    } catch (error) {
      console.error("[API] getPreferences error:", error);
      throw error;
    }
  },

  async updatePreferences(payload) {
    try {
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
