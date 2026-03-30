// src/utils/BotAPI.js
import axios from "axios";

// =========================
// CONFIGURATION
// =========================
const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || 
  "https://api.imali-defi.com";

const TOKEN_KEY = "imali_token";

// Helper function to check if we're on a billing-related page
const isStripePage = () => {
  const path = window.location.pathname;
  return path.includes('/billing') || 
         path.includes('/activation') ||
         path.includes('/signup') ||
         path.includes('/checkout') ||
         path.includes('/billing-dashboard');
};

// =========================
// AXIOS INSTANCE
// =========================
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// =========================
// TOKEN MANAGEMENT
// =========================
const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  console.log("[BotAPI] setStoredToken called with token length:", token?.length);
  if (!token || typeof token !== "string") {
    console.log("[BotAPI] Invalid token, not saving");
    return false;
  }
  try {
    localStorage.setItem(TOKEN_KEY, token);
    console.log("[BotAPI] Token saved to localStorage. Length:", token.length);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    return true;
  } catch (e) {
    console.error("[BotAPI] Failed to save token:", e);
    return false;
  }
};

const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    console.log("[BotAPI] Token cleared from localStorage");
  } catch {}
  delete api.defaults.headers.common["Authorization"];
};

// =========================
// REQUEST INTERCEPTORS
// =========================
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    
    console.error(`[API Error] ${status} - ${url}:`, error?.response?.data || error.message);
    
    // Clear token on 401
    if (status === 401) {
      clearStoredToken();
    }
    
    return Promise.reject(error);
  }
);

// =========================
// API CLIENT - COMPLETE WITH ALL ENDPOINTS
// =========================
const BotAPI = {
  // Token management
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => {
    const hasToken = !!getStoredToken();
    console.log("[BotAPI] isLoggedIn check:", hasToken);
    return hasToken;
  },
  clearCache: () => {},

  // ========================
  // AUTHENTICATION
  // ========================
  async signup(userData) {
    try {
      console.log("[BotAPI] Signup request for:", userData.email);
      const response = await api.post("/api/signup", userData);
      console.log("[BotAPI] Signup response:", response.data);
      
      const data = response.data;
      
      const token = data?.data?.token || data?.token;
      if (token) {
        console.log("[BotAPI] Token found in signup response");
        this.setToken(token);
      }
      
      return { 
        success: true, 
        data: data.data || data,
        token: token 
      };
    } catch (error) {
      console.error("[BotAPI] Signup error:", error.response?.data || error.message);
      throw error;
    }
  },

  async login(credentials) {
    try {
      console.log("[BotAPI] Login request for:", credentials.email);
      const response = await api.post("/api/auth/login", credentials);
      console.log("[BotAPI] Login response status:", response.status);
      console.log("[BotAPI] Login response data:", response.data);
      
      const data = response.data;
      
      if (data?.data?.twofa_required) {
        console.log("[BotAPI] 2FA required");
        return { 
          success: true, 
          twofaRequired: true, 
          tempToken: data.data.temp_token 
        };
      }
      
      const token = data?.data?.token || data?.token;
      
      if (token) {
        console.log("[BotAPI] Token found, saving...");
        const saved = this.setToken(token);
        console.log("[BotAPI] Token saved successfully:", saved);
        
        const verifyToken = this.getToken();
        console.log("[BotAPI] Verification - token in localStorage:", !!verifyToken);
      } else {
        console.log("[BotAPI] No token found in response");
        console.log("[BotAPI] Response structure:", Object.keys(data));
      }
      
      return { 
        success: true, 
        data: data.data || data,
        token: token 
      };
    } catch (error) {
      console.error("[BotAPI] Login error:", error.response?.data || error.message);
      throw error;
    }
  },

  async verify2FA(token, tempToken) {
    try {
      console.log("[BotAPI] Verifying 2FA...");
      const response = await api.post("/api/auth/2fa/verify-login", {
        token,
        temp_token: tempToken,
      });
      console.log("[BotAPI] 2FA verification response:", response.data);
      
      const data = response.data;
      const authToken = data?.data?.token || data?.token;
      
      if (authToken) {
        this.setToken(authToken);
      }
      
      return { success: true, data: data.data || data };
    } catch (error) {
      console.error("[BotAPI] 2FA verification error:", error);
      throw error;
    }
  },

  async me() {
    try {
      console.log("[BotAPI] Fetching user profile...");
      const response = await api.get("/api/me");
      console.log("[BotAPI] Profile response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Profile fetch error:", error);
      throw error;
    }
  },

  async activationStatus() {
    try {
      console.log("[BotAPI] Fetching activation status...");
      const response = await api.get("/api/me/activation-status");
      console.log("[BotAPI] Activation status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Activation status error:", error);
      throw error;
    }
  },

  // ========================
  // 2FA
  // ========================
  async setup2FA() {
    try {
      console.log("[BotAPI] Setting up 2FA...");
      const response = await api.post("/api/auth/2fa/setup");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Setup 2FA error:", error);
      throw error;
    }
  },

  async verify2FASetup(token) {
    try {
      console.log("[BotAPI] Verifying 2FA setup...");
      const response = await api.post("/api/auth/2fa/verify", { token });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Verify 2FA setup error:", error);
      throw error;
    }
  },

  async disable2FA(token) {
    try {
      console.log("[BotAPI] Disabling 2FA...");
      const response = await api.post("/api/auth/2fa/disable", { token });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Disable 2FA error:", error);
      throw error;
    }
  },

  // ========================
  // INTEGRATIONS
  // ========================
  async connectOKX(payload) {
    try {
      const response = await api.post("/api/integrations/okx", payload);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] OKX connection error:", error);
      throw error;
    }
  },

  async connectAlpaca(payload) {
    try {
      const response = await api.post("/api/integrations/alpaca", payload);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Alpaca connection error:", error);
      throw error;
    }
  },

  async connectWallet(payload) {
    try {
      const response = await api.post("/api/integrations/wallet", payload);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Wallet connection error:", error);
      throw error;
    }
  },

  async getIntegrationStatus() {
    try {
      const response = await api.get("/api/integrations/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Integration status error:", error);
      throw error;
    }
  },

  async getIntegrationHealth() {
    try {
      const response = await api.get("/api/integrations/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Integration health error:", error);
      throw error;
    }
  },

  // ========================
  // TRADING & BOTS
  // ========================
  async toggleTrading(enabled) {
    try {
      const response = await api.post("/api/trading/enable", { enabled });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Toggle trading error:", error);
      throw error;
    }
  },

  async getTradingStatus() {
    try {
      const response = await api.get("/api/trading/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Trading status error:", error);
      throw error;
    }
  },

  async startBot(mode = "paper", strategy = "ai_weighted") {
    try {
      const response = await api.post("/api/bot/start", { mode, strategy });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Start bot error:", error);
      throw error;
    }
  },

  async getBotStatus() {
    try {
      console.log("[BotAPI] Fetching bot status...");
      const response = await api.get("/api/bot/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Bot status error:", error);
      return { bots: [], total_bots: 0, active_bots: 0 };
    }
  },

  // ========================
  // TRADES
  // ========================
  async getTrades(limit = 100) {
    try {
      console.log("[BotAPI] Fetching trades...");
      const response = await api.get(`/api/sniper/trades?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching trades:", error);
      return { trades: [], count: 0 };
    }
  },

  async getRecentTrades(limit = 20) {
    try {
      console.log("[BotAPI] Fetching recent trades...");
      const response = await api.get(`/api/trades/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching recent trades:", error);
      return { trades: [], count: 0 };
    }
  },

  async getTradeById(tradeId) {
    try {
      console.log("[BotAPI] Fetching trade:", tradeId);
      const response = await api.get(`/api/trades/${tradeId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching trade:", error);
      throw error;
    }
  },

  // ========================
  // DISCOVERIES
  // ========================
  async getDiscoveries(limit = 20) {
    try {
      console.log("[BotAPI] Fetching discoveries...");
      const response = await api.get(`/api/discoveries?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching discoveries:", error);
      return { discoveries: [], total: 0, stats: {} };
    }
  },

  async getRecentDiscoveries(limit = 10) {
    try {
      console.log("[BotAPI] Fetching recent discoveries...");
      const response = await api.get(`/api/discoveries/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching recent discoveries:", error);
      return { discoveries: [], count: 0 };
    }
  },

  // ========================
  // ANALYTICS
  // ========================
  async getAnalyticsSummary() {
    try {
      console.log("[BotAPI] Fetching analytics summary...");
      const response = await api.get("/api/analytics/get_analytics_summary");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching analytics summary:", error);
      return { summary: {} };
    }
  },

  async getPnLAnalytics(period = "30d", interval = "daily", chartType = "line") {
    try {
      console.log("[BotAPI] Fetching P&L analytics...");
      const response = await api.get(`/api/analytics/pnl?period=${period}&interval=${interval}&chart_type=${chartType}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching P&L analytics:", error);
      return { series: [], summary: {} };
    }
  },

  async getWinLossAnalytics(period = "30d") {
    try {
      console.log("[BotAPI] Fetching win/loss analytics...");
      const response = await api.get(`/api/analytics/winloss?period=${period}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching win/loss analytics:", error);
      return { win_loss: {} };
    }
  },

  async getFeeAnalytics(period = "30d") {
    try {
      console.log("[BotAPI] Fetching fee analytics...");
      const response = await api.get(`/api/analytics/fees?period=${period}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching fee analytics:", error);
      return { series: [], summary: {} };
    }
  },

  async exportAnalytics(period = "30d", format = "pdf") {
    try {
      console.log("[BotAPI] Exporting analytics...");
      const response = await api.get(`/api/analytics/export?period=${period}&format=${format}`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error("[BotAPI] Error exporting analytics:", error);
      throw error;
    }
  },

  async getPnLHistory(period = "30d") {
    try {
      console.log("[BotAPI] Fetching P&L history...");
      const response = await api.get(`/api/pnl/history?period=${period}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching P&L history:", error);
      return { history: [], period: period, total_pnl: 0 };
    }
  },

  // ========================
  // PUBLIC ENDPOINTS
  // ========================
  async getLiveStats() {
    try {
      console.log("[BotAPI] Fetching live stats...");
      const response = await api.get("/api/public/live-stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching live stats:", error);
      return {};
    }
  },

  async getPublicTiers() {
    try {
      console.log("[BotAPI] Fetching public tiers...");
      const response = await api.get("/api/public/tiers");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching public tiers:", error);
      return { tiers: {} };
    }
  },

  async getPublicFAQ() {
    try {
      console.log("[BotAPI] Fetching public FAQ...");
      const response = await api.get("/api/public/faq");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching public FAQ:", error);
      return { faqs: [] };
    }
  },

  async getPublicRoadmap() {
    try {
      console.log("[BotAPI] Fetching public roadmap...");
      const response = await api.get("/api/public/roadmap");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching public roadmap:", error);
      return {};
    }
  },

  async getPublicHistorical() {
    try {
      console.log("[BotAPI] Fetching public historical data...");
      const response = await api.get("/api/public/historical");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching public historical:", error);
      return { daily: [], weekly: [], monthly: [] };
    }
  },

  // ========================
  // TRADING PAIRS & STRATEGIES
  // ========================
  async getTradingPairs() {
    try {
      console.log("[BotAPI] Fetching trading pairs...");
      const response = await api.get("/api/trading/pairs");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching trading pairs:", error);
      return { pairs: [], tier: "starter", count: 0 };
    }
  },

  async getTradingStrategies() {
    try {
      console.log("[BotAPI] Fetching trading strategies...");
      const response = await api.get("/api/trading/strategies");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error fetching trading strategies:", error);
      return { strategies: [], current_strategy: "ai_weighted", count: 0 };
    }
  },

  async updateUserStrategy(strategy) {
    try {
      console.log("[BotAPI] Updating strategy to:", strategy);
      const response = await api.put("/api/user/strategy", { strategy });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Error updating strategy:", error);
      throw error;
    }
  },

  // ========================
  // BILLING (WITH STRIPE GUARDS)
  // ========================
  async createSetupIntent(payload = {}) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping createSetupIntent - not on billing page, path:", window.location.pathname);
      return { should_skip: true, message: "Not on billing page" };
    }
    
    try {
      console.log("[BotAPI] Creating setup intent...");
      const response = await api.post("/api/billing/setup-intent", payload);
      console.log("[BotAPI] Setup intent response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Setup intent error:", error);
      throw error;
    }
  },

  async getCardStatus() {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping getCardStatus - not on billing page, path:", window.location.pathname);
      return { has_card: false, should_skip: true };
    }
    
    try {
      console.log("[BotAPI] Fetching card status...");
      const response = await api.get("/api/billing/card-status");
      console.log("[BotAPI] Card status response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Card status error:", error);
      return { has_card: false };
    }
  },

  async confirmCard() {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping confirmCard - not on billing page, path:", window.location.pathname);
      return { should_skip: true };
    }
    
    try {
      console.log("[BotAPI] Confirming card...");
      const response = await api.post("/api/billing/confirm-card");
      console.log("[BotAPI] Confirm card response:", response.data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Confirm card error:", error);
      throw error;
    }
  },

  async setDefaultPayment(paymentMethodId, customerId = null) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping setDefaultPayment - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/set-default-payment", {
        payment_method_id: paymentMethodId,
        customer_id: customerId
      });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Set default payment error:", error);
      throw error;
    }
  },

  async getSubscription() {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping getSubscription - not on billing page, path:", window.location.pathname);
      return { has_subscription: false, tier: "starter", should_skip: true };
    }
    
    try {
      console.log("[BotAPI] Fetching subscription...");
      const response = await api.get("/api/billing/subscription");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Subscription error:", error);
      return { has_subscription: false, tier: "starter" };
    }
  },

  async createSubscription(tier) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping createSubscription - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/subscription/create", { tier });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Create subscription error:", error);
      throw error;
    }
  },

  async cancelSubscription(cancelAtPeriodEnd = true, reason = "") {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping cancelSubscription - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/subscription/cancel", { 
        cancel_at_period_end: cancelAtPeriodEnd,
        reason 
      });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Cancel subscription error:", error);
      throw error;
    }
  },

  async updateSubscription(newTier) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping updateSubscription - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/subscription/update", { tier: newTier });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Update subscription error:", error);
      throw error;
    }
  },

  async getInvoices(limit = 12) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping getInvoices - not on billing page");
      return { invoices: [] };
    }
    
    try {
      const response = await api.get(`/api/billing/invoices?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Invoices error:", error);
      return { invoices: [] };
    }
  },

  async getUpcomingInvoice(newTier = null) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping getUpcomingInvoice - not on billing page");
      return { has_subscription: false };
    }
    
    try {
      let url = "/api/billing/upcoming-invoice";
      if (newTier) {
        url += `?new_tier=${newTier}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Upcoming invoice error:", error);
      return { has_subscription: false };
    }
  },

  async createPortalSession() {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping createPortalSession - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/portal");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Portal session error:", error);
      throw error;
    }
  },

  async previewSubscriptionChange(newTier) {
    // Skip if not on a billing-related page
    if (!isStripePage()) {
      console.log("[BotAPI] Skipping previewSubscriptionChange - not on billing page");
      return { should_skip: true };
    }
    
    try {
      const response = await api.post("/api/billing/subscription/preview", { tier: newTier });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Preview change error:", error);
      throw error;
    }
  },

  // ========================
  // PROMO CODES
  // ========================
  async getPromoStatus() {
    try {
      console.log("[BotAPI] Fetching promo status...");
      const response = await api.get("/api/promo/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Promo status error:", error);
      return { limit: 50, claimed: 0, spots_left: 50, active: true };
    }
  },

  async claimPromo(payload) {
    try {
      console.log("[BotAPI] Claiming promo for:", payload.email);
      const response = await api.post("/api/promo/claim", payload);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Claim promo error:", error);
      throw error;
    }
  },

  async getMyPromoStatus() {
    try {
      console.log("[BotAPI] Fetching my promo status...");
      const response = await api.get("/api/promo/me");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] My promo status error:", error);
      return { eligible: false };
    }
  },

  async applyPromoCode(code) {
    try {
      console.log("[BotAPI] Applying promo code:", code);
      const response = await api.post("/api/promo/apply", { code });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Apply promo error:", error);
      throw error;
    }
  },

  // ========================
  // REFERRALS
  // ========================
  async getReferralInfo() {
    try {
      console.log("[BotAPI] Fetching referral info...");
      const response = await api.get("/api/referrals/info");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Referral info error:", error);
      return { code: "", count: 0, earned: 0 };
    }
  },

  async validateReferralCode(code) {
    try {
      console.log("[BotAPI] Validating referral code:", code);
      const response = await api.post("/api/referrals/validate", { code });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Validate referral error:", error);
      throw error;
    }
  },

  // ========================
  // WITHDRAWALS
  // ========================
  async createWithdrawal(amount, method, address) {
    try {
      console.log("[BotAPI] Creating withdrawal...");
      const response = await api.post("/api/withdrawals", { amount, method, address });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Create withdrawal error:", error);
      throw error;
    }
  },

  async getWithdrawals() {
    try {
      console.log("[BotAPI] Fetching withdrawals...");
      const response = await api.get("/api/withdrawals");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Withdrawals error:", error);
      return { withdrawals: [] };
    }
  },

  // ========================
  // WAITLIST
  // ========================
  async joinWaitlist(email, tier = "starter") {
    try {
      console.log("[BotAPI] Joining waitlist:", email);
      const response = await api.post("/api/waitlist", { email, tier });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Join waitlist error:", error);
      throw error;
    }
  },

  async getWaitlistPosition(email) {
    try {
      console.log("[BotAPI] Getting waitlist position for:", email);
      const response = await api.get(`/api/waitlist/position?email=${encodeURIComponent(email)}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Waitlist position error:", error);
      return { position: null, status: "unknown" };
    }
  },

  // ========================
  // ANNOUNCEMENTS
  // ========================
  async getAnnouncements() {
    try {
      console.log("[BotAPI] Fetching announcements...");
      const response = await api.get("/api/announcements");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Announcements error:", error);
      return { announcements: [] };
    }
  },

  async markAnnouncementRead(announcementId) {
    try {
      console.log("[BotAPI] Marking announcement as read:", announcementId);
      const response = await api.post(`/api/announcements/${announcementId}/read`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Mark announcement read error:", error);
      throw error;
    }
  },

  // ========================
  // SUPPORT TICKETS
  // ========================
  async createTicket(subject, message, priority = "normal") {
    try {
      console.log("[BotAPI] Creating support ticket...");
      const response = await api.post("/api/support/tickets", { subject, message, priority });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Create ticket error:", error);
      throw error;
    }
  },

  async getTickets() {
    try {
      console.log("[BotAPI] Fetching tickets...");
      const response = await api.get("/api/support/tickets");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Tickets error:", error);
      return { tickets: [] };
    }
  },

  async getTicket(ticketId) {
    try {
      console.log("[BotAPI] Fetching ticket:", ticketId);
      const response = await api.get(`/api/support/tickets/${ticketId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Get ticket error:", error);
      throw error;
    }
  },

  async addTicketMessage(ticketId, message) {
    try {
      console.log("[BotAPI] Adding message to ticket:", ticketId);
      const response = await api.post(`/api/support/tickets/${ticketId}/messages`, { message });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Add message error:", error);
      throw error;
    }
  },

  // ========================
  // ACTIVITY & SECURITY
  // ========================
  async getActivityLogs(limit = 50) {
    try {
      console.log("[BotAPI] Fetching activity logs...");
      const response = await api.get(`/api/activity?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Activity logs error:", error);
      return { activities: [] };
    }
  },

  async getLoginHistory(limit = 20) {
    try {
      console.log("[BotAPI] Fetching login history...");
      const response = await api.get(`/api/security/logins?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Login history error:", error);
      return { logins: [] };
    }
  },

  // ========================
  // EXPORTS
  // ========================
  async exportTrades(format = "csv", startDate = null, endDate = null) {
    try {
      console.log("[BotAPI] Exporting trades...");
      let url = `/api/export/trades?format=${format}`;
      if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
      
      const response = await api.get(url, { responseType: 'blob' });
      return response;
    } catch (error) {
      console.error("[BotAPI] Export trades error:", error);
      throw error;
    }
  },

  // ========================
  // API KEYS
  // ========================
  async getApiKeys() {
    try {
      console.log("[BotAPI] Fetching API keys...");
      const response = await api.get("/api/keys");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] API keys error:", error);
      return { keys: [] };
    }
  },

  async createApiKey(name, permissions = ["read"], expiresInDays = 365) {
    try {
      console.log("[BotAPI] Creating API key:", name);
      const response = await api.post("/api/keys", { name, permissions, expires_in_days: expiresInDays });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Create API key error:", error);
      throw error;
    }
  },

  async revokeApiKey(keyId) {
    try {
      console.log("[BotAPI] Revoking API key:", keyId);
      const response = await api.delete(`/api/keys/${keyId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Revoke API key error:", error);
      throw error;
    }
  },

  // ========================
  // NOTIFICATIONS
  // ========================
  async getNotificationSettings() {
    try {
      console.log("[BotAPI] Fetching notification settings...");
      const response = await api.get("/api/notifications/settings");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Notification settings error:", error);
      return { settings: {} };
    }
  },

  async updateNotificationSettings(settings) {
    try {
      console.log("[BotAPI] Updating notification settings...");
      const response = await api.put("/api/notifications/settings", settings);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Update notification settings error:", error);
      throw error;
    }
  },

  async getNotifications(limit = 50, includeRead = false) {
    try {
      console.log("[BotAPI] Fetching notifications...");
      const response = await api.get(`/api/notifications?limit=${limit}&include_read=${includeRead}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Notifications error:", error);
      return { notifications: [], unread_count: 0 };
    }
  },

  async markNotificationRead(notificationId) {
    try {
      console.log("[BotAPI] Marking notification as read:", notificationId);
      const response = await api.post(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Mark notification read error:", error);
      throw error;
    }
  },

  async markAllNotificationsRead() {
    try {
      console.log("[BotAPI] Marking all notifications as read...");
      const response = await api.post("/api/notifications/read-all");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Mark all notifications read error:", error);
      throw error;
    }
  },

  async deleteNotification(notificationId) {
    try {
      console.log("[BotAPI] Deleting notification:", notificationId);
      const response = await api.delete(`/api/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Delete notification error:", error);
      throw error;
    }
  },

  // ========================
  // DOCUMENTS
  // ========================
  async getDocumentUploadUrl(documentType, filename, contentType = "application/pdf") {
    try {
      console.log("[BotAPI] Getting document upload URL...");
      const response = await api.post("/api/documents/upload-url", { 
        document_type: documentType, 
        filename, 
        content_type: contentType 
      });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Document upload URL error:", error);
      throw error;
    }
  },

  async getDocuments() {
    try {
      console.log("[BotAPI] Fetching documents...");
      const response = await api.get("/api/documents");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Documents error:", error);
      return { documents: [] };
    }
  },

  async getDocument(documentId) {
    try {
      console.log("[BotAPI] Fetching document:", documentId);
      const response = await api.get(`/api/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Get document error:", error);
      throw error;
    }
  },

  async deleteDocument(documentId) {
    try {
      console.log("[BotAPI] Deleting document:", documentId);
      const response = await api.delete(`/api/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Delete document error:", error);
      throw error;
    }
  },

  // ========================
  // USER STATS
  // ========================
  async getUserStats() {
    try {
      console.log("[BotAPI] Fetching user stats...");
      const response = await api.get("/api/user/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] User stats error:", error);
      return { 
        total_users: 0, 
        active_users: 0, 
        total_trades_platform: 0, 
        total_volume: 0,
        avg_trade_size: 0,
        growth_rate: 0,
        top_traders: []
      };
    }
  },

  // ========================
  // USER DASHBOARD
  // ========================
  async getPortfolioPerformance() {
    try {
      console.log("[BotAPI] Fetching portfolio performance...");
      const response = await api.get("/api/user/portfolio/performance");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Portfolio performance error:", error);
      return {};
    }
  },

  async getPortfolioHoldings() {
    try {
      console.log("[BotAPI] Fetching portfolio holdings...");
      const response = await api.get("/api/user/portfolio/holdings");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Portfolio holdings error:", error);
      return { holdings: {} };
    }
  },

  async getUserAlerts() {
    try {
      console.log("[BotAPI] Fetching user alerts...");
      const response = await api.get("/api/user/alerts");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] User alerts error:", error);
      return { alerts: [] };
    }
  },

  async createUserAlert(alertData) {
    try {
      console.log("[BotAPI] Creating user alert...");
      const response = await api.post("/api/user/alerts", alertData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Create alert error:", error);
      throw error;
    }
  },

  // ========================
  // PASSWORD MANAGEMENT
  // ========================
  async forgotPassword(email) {
    try {
      console.log("[BotAPI] Sending password reset for:", email);
      const response = await api.post("/api/auth/forgot-password", { email });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Forgot password error:", error);
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      console.log("[BotAPI] Resetting password...");
      const response = await api.post("/api/auth/reset-password", {
        token,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Reset password error:", error);
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      console.log("[BotAPI] Changing password...");
      const response = await api.post("/api/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Change password error:", error);
      throw error;
    }
  },

  // ========================
  // EMAIL VERIFICATION
  // ========================
  async sendVerificationEmail() {
    try {
      console.log("[BotAPI] Sending verification email...");
      const response = await api.post("/api/auth/send-verification");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Send verification email error:", error);
      throw error;
    }
  },

  async verifyEmail(token) {
    try {
      console.log("[BotAPI] Verifying email...");
      const response = await api.post("/api/auth/verify-email", { token });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Verify email error:", error);
      throw error;
    }
  },

  // ========================
  // WEBSOCKET
  // ========================
  async getWebSocketToken() {
    try {
      console.log("[BotAPI] Getting WebSocket token...");
      const response = await api.get("/api/ws/token");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] WebSocket token error:", error);
      throw error;
    }
  },

  // ========================
  // HEALTH & STATUS
  // ========================
  async healthCheck() {
    try {
      const response = await api.get("/api/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Health check error:", error);
      return { status: "unhealthy" };
    }
  },

  async detailedHealthCheck() {
    try {
      const response = await api.get("/api/health/detailed");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Detailed health check error:", error);
      return { status: "unhealthy", services: {} };
    }
  },

  async apiStatus() {
    try {
      const response = await api.get("/api/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] API status error:", error);
      return { status: "operational", version: "1.0.0" };
    }
  },

  // ========================
  // MESSAGES
  // ========================
  async getMessages() {
    try {
      console.log("[BotAPI] Fetching messages...");
      const response = await api.get("/api/messages");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Messages error:", error);
      return { messages: [], unread_count: 0 };
    }
  },

  async markMessageRead(messageId) {
    try {
      console.log("[BotAPI] Marking message as read:", messageId);
      const response = await api.post(`/api/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Mark message read error:", error);
      throw error;
    }
  },

  // ========================
  // PROXY ENDPOINTS (BOT APIS)
  // ========================
  async getFuturesHealth() {
    try {
      const response = await api.get("/api/proxy/futures/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Futures health error:", error);
      return { error: "Futures bot unavailable" };
    }
  },

  async getFuturesTrades() {
    try {
      const response = await api.get("/api/proxy/futures/trades");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Futures trades error:", error);
      return { trades: [] };
    }
  },

  async getFuturesPositions() {
    try {
      const response = await api.get("/api/proxy/futures/positions");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Futures positions error:", error);
      return { positions: [] };
    }
  },

  async getStocksHealth() {
    try {
      const response = await api.get("/api/proxy/stocks/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Stocks health error:", error);
      return { error: "Stocks bot unavailable" };
    }
  },

  async getStocksPositions() {
    try {
      const response = await api.get("/api/proxy/stocks/positions");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Stocks positions error:", error);
      return { positions: [] };
    }
  },

  async getSniperHealth() {
    try {
      const response = await api.get("/api/proxy/sniper/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Sniper health error:", error);
      return { error: "Sniper bot unavailable" };
    }
  },

  async getSniperDiscoveries() {
    try {
      const response = await api.get("/api/proxy/sniper/discoveries");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Sniper discoveries error:", error);
      return { discoveries: [] };
    }
  },

  async getOKXHealth() {
    try {
      const response = await api.get("/api/proxy/okx/health");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] OKX health error:", error);
      return { error: "OKX bot unavailable" };
    }
  },

  async getAllBotsHealth() {
    try {
      const response = await api.get("/api/proxy/all");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] All bots health error:", error);
      return {};
    }
  },

  // ========================
  // ADMIN ENDPOINTS
  // ========================
  async adminCheck() {
    try {
      const response = await api.get("/api/admin/check");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin check error:", error);
      return { is_admin: false };
    }
  },

  async adminGetUsers() {
    try {
      const response = await api.get("/api/admin/users");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get users error:", error);
      return { users: [] };
    }
  },

  async adminCreateUser(userData) {
    try {
      const response = await api.post("/api/admin/users/create", userData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create user error:", error);
      throw error;
    }
  },

  async adminDeleteUser(userId) {
    try {
      const response = await api.delete(`/api/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin delete user error:", error);
      throw error;
    }
  },

  async adminUpdateUserTier(userId, tier) {
    try {
      const response = await api.patch(`/api/admin/users/${userId}/tier`, { tier });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update user tier error:", error);
      throw error;
    }
  },

  async adminToggleTrading(userId, enabled) {
    try {
      const response = await api.post(`/api/admin/users/${userId}/trading`, { enabled });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin toggle trading error:", error);
      throw error;
    }
  },

  async adminCreatePromo(promoData) {
    try {
      const response = await api.post("/api/admin/promo/create", promoData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create promo error:", error);
      throw error;
    }
  },

  async adminListPromos() {
    try {
      const response = await api.get("/api/admin/promo/list");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list promos error:", error);
      return { promos: [] };
    }
  },

  async adminGetReferralStats() {
    try {
      const response = await api.get("/api/admin/referrals/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin referral stats error:", error);
      return { stats: {} };
    }
  },

  async adminGetReferralSettings() {
    try {
      const response = await api.get("/api/admin/referrals/settings");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin referral settings error:", error);
      return { settings: {} };
    }
  },

  async adminUpdateReferralSettings(settings) {
    try {
      const response = await api.put("/api/admin/referrals/settings", settings);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update referral settings error:", error);
      throw error;
    }
  },

  async adminGetUserReferrals(userId) {
    try {
      const response = await api.get(`/api/admin/referrals/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get user referrals error:", error);
      throw error;
    }
  },

  async adminProcessPayouts(dryRun = true, minPayout = 50) {
    try {
      const response = await api.post("/api/admin/referrals/process-payouts", { dry_run: dryRun, min_payout: minPayout });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin process payouts error:", error);
      throw error;
    }
  },

  async adminCreateAnnouncement(announcementData) {
    try {
      const response = await api.post("/api/admin/announcements", announcementData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create announcement error:", error);
      throw error;
    }
  },

  async adminListAnnouncements() {
    try {
      const response = await api.get("/api/admin/announcements");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list announcements error:", error);
      return { announcements: [] };
    }
  },

  async adminListWithdrawals(status = null) {
    try {
      let url = "/api/admin/withdrawals";
      if (status) url += `?status=${status}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list withdrawals error:", error);
      return { withdrawals: [] };
    }
  },

  async adminProcessWithdrawal(withdrawalId, action) {
    try {
      const response = await api.post(`/api/admin/withdrawals/${withdrawalId}/${action}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin process withdrawal error:", error);
      throw error;
    }
  },

  async adminListWaitlist() {
    try {
      const response = await api.get("/api/admin/waitlist");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list waitlist error:", error);
      return { waitlist: [] };
    }
  },

  async adminActivateWaitlist(email) {
    try {
      const response = await api.post(`/api/admin/waitlist/activate/${email}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin activate waitlist error:", error);
      throw error;
    }
  },

  async adminListSupportTickets(status = null) {
    try {
      let url = "/api/admin/support/tickets";
      if (status) url += `?status=${status}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list support tickets error:", error);
      return { tickets: [] };
    }
  },

  async adminUpdateTicketStatus(ticketId, status) {
    try {
      const response = await api.put(`/api/admin/support/tickets/${ticketId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update ticket status error:", error);
      throw error;
    }
  },

  async adminGetTokenStats() {
    try {
      const response = await api.get("/api/admin/token/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin token stats error:", error);
      return { total_supply: 0, circulating_supply: 0, holders: 0, price_usd: 0 };
    }
  },

  async adminMintTokens(amount, address) {
    try {
      const response = await api.post("/api/admin/token/mint", { amount, address });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin mint tokens error:", error);
      throw error;
    }
  },

  async adminBurnTokens(amount) {
    try {
      const response = await api.post("/api/admin/token/burn", { amount });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin burn tokens error:", error);
      throw error;
    }
  },

  async adminGetBuybackStats() {
    try {
      const response = await api.get("/api/admin/buyback/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin buyback stats error:", error);
      return { total_bought: 0, total_spent: 0 };
    }
  },

  async adminTriggerBuyback(amount) {
    try {
      const response = await api.post("/api/admin/buyback/trigger", { amount });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin trigger buyback error:", error);
      throw error;
    }
  },

  async adminGetTreasuryStats() {
    try {
      const response = await api.get("/api/admin/treasury/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin treasury stats error:", error);
      return { balance: 0, staked: 0 };
    }
  },

  async adminTreasuryWithdraw(amount, address) {
    try {
      const response = await api.post("/api/admin/treasury/withdraw", { amount, address });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin treasury withdraw error:", error);
      throw error;
    }
  },

  async adminGetCEXBalances() {
    try {
      const response = await api.get("/api/admin/cex/balances");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin CEX balances error:", error);
      return { okx: {}, alpaca: {} };
    }
  },

  async adminCEXTransfer(exchange, direction, asset, amount) {
    try {
      const response = await api.post("/api/admin/cex/transfer", { exchange, direction, asset, amount });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin CEX transfer error:", error);
      throw error;
    }
  },

  async adminGetStockPositions() {
    try {
      const response = await api.get("/api/admin/stocks/positions");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin stock positions error:", error);
      return { positions: [] };
    }
  },

  async adminExecuteStockTrade(symbol, action, shares) {
    try {
      const response = await api.post("/api/admin/stocks/trade", { symbol, action, shares });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin stock trade error:", error);
      throw error;
    }
  },

  async adminListNFTs() {
    try {
      const response = await api.get("/api/admin/nfts");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list NFTs error:", error);
      return { nfts: [] };
    }
  },

  async adminMintNFT(name, address, metadata = {}) {
    try {
      const response = await api.post("/api/admin/nfts/mint", { name, address, metadata });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin mint NFT error:", error);
      throw error;
    }
  },

  async adminBurnNFT(nftId) {
    try {
      const response = await api.post(`/api/admin/nfts/${nftId}/burn`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin burn NFT error:", error);
      throw error;
    }
  },

  async adminListSocialPosts() {
    try {
      const response = await api.get("/api/admin/social/posts");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin list social posts error:", error);
      return { posts: [] };
    }
  },

  async adminCreateSocialPost(postData) {
    try {
      const response = await api.post("/api/admin/social/posts", postData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create social post error:", error);
      throw error;
    }
  },

  async adminPublishSocialPost(postId) {
    try {
      const response = await api.post(`/api/admin/social/posts/${postId}/publish`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin publish social post error:", error);
      throw error;
    }
  },

  async adminProcessScheduledPosts() {
    try {
      const response = await api.post("/api/admin/social/process-scheduled");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin process scheduled posts error:", error);
      throw error;
    }
  },

  async adminGetSocialStats() {
    try {
      const response = await api.get("/api/admin/social/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin social stats error:", error);
      return { totalPosts: 0, engagement: 0, followers: 0 };
    }
  },

  async adminScheduleSocialPost(postId, scheduledTime) {
    try {
      const response = await api.post("/api/admin/social/schedule", { post_id: postId, scheduled_time: scheduledTime });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin schedule social post error:", error);
      throw error;
    }
  },

  async adminGetPlatformStatus() {
    try {
      const response = await api.get("/api/admin/social/platforms/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin platform status error:", error);
      return { platforms: {} };
    }
  },

  async adminDeleteSocialPost(postId) {
    try {
      const response = await api.delete(`/api/admin/social/post/${postId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin delete social post error:", error);
      throw error;
    }
  },

  async adminUpdateSocialPost(postId, updateData) {
    try {
      const response = await api.put(`/api/admin/social/post/${postId}`, updateData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update social post error:", error);
      throw error;
    }
  },

  async adminTestSocialPost(platform, message) {
    try {
      const response = await api.post("/api/admin/social/test", { platform, message });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin test social post error:", error);
      throw error;
    }
  },

  async adminGetSocialStatus() {
    try {
      const response = await api.get("/api/admin/social/status");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin social status error:", error);
      return { telegram: {}, twitter: {}, discord: {} };
    }
  },

  async adminGetEmailTemplates() {
    try {
      const response = await api.get("/api/admin/email/templates");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin email templates error:", error);
      return { templates: {} };
    }
  },

  async adminUpdateEmailTemplate(templateName, subject, template) {
    try {
      const response = await api.put(`/api/admin/email/templates/${templateName}`, { subject, template });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update email template error:", error);
      throw error;
    }
  },

  async adminPreviewEmailTemplate(templateName, previewData = {}) {
    try {
      const response = await api.post(`/api/admin/email/templates/${templateName}/preview`, previewData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin preview email template error:", error);
      throw error;
    }
  },

  async adminGetScheduledPosts() {
    try {
      const response = await api.get("/api/admin/social/scheduled");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin scheduled posts error:", error);
      return { posts: [] };
    }
  },

  async adminGetCampaigns() {
    try {
      const response = await api.get("/api/admin/campaigns");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin campaigns error:", error);
      return { campaigns: [] };
    }
  },

  async adminCreateCampaign(campaignData) {
    try {
      const response = await api.post("/api/admin/campaigns", campaignData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create campaign error:", error);
      throw error;
    }
  },

  async adminLaunchCampaign(campaignId) {
    try {
      const response = await api.post(`/api/admin/campaigns/${campaignId}/launch`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin launch campaign error:", error);
      throw error;
    }
  },

  async adminPauseCampaign(campaignId) {
    try {
      const response = await api.post(`/api/admin/campaigns/${campaignId}/pause`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin pause campaign error:", error);
      throw error;
    }
  },

  async adminGetAutomationJobs() {
    try {
      const response = await api.get("/api/admin/automation/jobs");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin automation jobs error:", error);
      return { jobs: [] };
    }
  },

  async adminToggleAutomationJob(jobId) {
    try {
      const response = await api.post("/api/admin/automation/jobs/toggle", { jobId });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin toggle automation job error:", error);
      throw error;
    }
  },

  async adminRunAutomationJob(jobId) {
    try {
      const response = await api.post("/api/admin/automation/jobs/run", { jobId });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin run automation job error:", error);
      throw error;
    }
  },

  async adminUpdateAutomationSchedule(jobId, schedule) {
    try {
      const response = await api.post("/api/admin/automation/schedule", { jobId, schedule });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update automation schedule error:", error);
      throw error;
    }
  },

  async adminGetAutomationLogs(jobId = null, limit = 50) {
    try {
      let url = "/api/admin/automation/logs";
      if (jobId) url += `?jobId=${jobId}&limit=${limit}`;
      else url += `?limit=${limit}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin automation logs error:", error);
      return { logs: [] };
    }
  },

  async adminGetJobLogs(jobId, limit = 50) {
    try {
      const response = await api.get(`/api/admin/automation/logs/${jobId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin job logs error:", error);
      return { logs: [] };
    }
  },

  async adminGetAutomationTemplates(jobId) {
    try {
      const response = await api.get(`/api/admin/automation/templates?jobId=${jobId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin automation templates error:", error);
      return { templates: {} };
    }
  },

  async adminUpdateAutomationTemplates(jobId, templates) {
    try {
      const response = await api.post("/api/admin/automation/templates", { jobId, templates });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update automation templates error:", error);
      throw error;
    }
  },

  async adminTestAutomation(jobId, channel, template) {
    try {
      const response = await api.post("/api/admin/automation/test", { jobId, channel, template });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin test automation error:", error);
      throw error;
    }
  },

  async adminGetAutomationStats() {
    try {
      const response = await api.get("/api/admin/automation/stats");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin automation stats error:", error);
      return { total_posts: 0, total_emails: 0, active_jobs: 0 };
    }
  },

  async adminGetConfig() {
    try {
      const response = await api.get("/api/admin/config");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin config error:", error);
      return { config: {} };
    }
  },

  async adminUpdateConfig(configData) {
    try {
      const response = await api.put("/api/admin/config", configData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update config error:", error);
      throw error;
    }
  },

  async adminGetMetrics() {
    try {
      const response = await api.get("/api/admin/metrics");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin metrics error:", error);
      return { users: {}, trading: {}, revenue: {} };
    }
  },

  async adminGetTradingVolumeAnalytics(period = "30d") {
    try {
      const response = await api.get(`/api/admin/analytics/trading-volume?period=${period}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin trading volume analytics error:", error);
      return { daily: [], total_volume: 0 };
    }
  },

  async adminGetUserAcquisition() {
    try {
      const response = await api.get("/api/admin/analytics/user-acquisition");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin user acquisition error:", error);
      return { total_users: 0, signups_by_date: {} };
    }
  },

  async adminGetAuditLogs(limit = 100, userId = null, action = null) {
    try {
      let url = `/api/admin/audit-logs?limit=${limit}`;
      if (userId) url += `&user_id=${userId}`;
      if (action) url += `&action=${action}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin audit logs error:", error);
      return { logs: [] };
    }
  },

  async adminGetUserAuditLogs(userId, limit = 50) {
    try {
      const response = await api.get(`/api/admin/audit-logs/user/${userId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin user audit logs error:", error);
      return { logs: [] };
    }
  },

  // ========================
  // ADMIN TRADING PAIRS MANAGEMENT (NEW)
  // ========================
  async adminGetAllTradingPairs() {
    try {
      const response = await api.get("/api/admin/trading/pairs");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get trading pairs error:", error);
      return { pairs: [], count: 0 };
    }
  },

  async adminCreateTradingPair(pairData) {
    try {
      const response = await api.post("/api/admin/trading/pairs", pairData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create trading pair error:", error);
      throw error;
    }
  },

  async adminUpdateTradingPair(pairId, pairData) {
    try {
      const response = await api.put(`/api/admin/trading/pairs/${pairId}`, pairData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update trading pair error:", error);
      throw error;
    }
  },

  async adminDeleteTradingPair(pairId) {
    try {
      const response = await api.delete(`/api/admin/trading/pairs/${pairId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin delete trading pair error:", error);
      throw error;
    }
  },

  // ========================
  // ADMIN TRADING STRATEGIES MANAGEMENT (NEW)
  // ========================
  async adminGetAllTradingStrategies() {
    try {
      const response = await api.get("/api/admin/trading/strategies");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get trading strategies error:", error);
      return { strategies: [], count: 0 };
    }
  },

  async adminCreateTradingStrategy(strategyData) {
    try {
      const response = await api.post("/api/admin/trading/strategies", strategyData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin create trading strategy error:", error);
      throw error;
    }
  },

  async adminUpdateTradingStrategy(strategyId, strategyData) {
    try {
      const response = await api.put(`/api/admin/trading/strategies/${strategyId}`, strategyData);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update trading strategy error:", error);
      throw error;
    }
  },

  async adminDeleteTradingStrategy(strategyId) {
    try {
      const response = await api.delete(`/api/admin/trading/strategies/${strategyId}`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin delete trading strategy error:", error);
      throw error;
    }
  },

  // ========================
  // ADMIN BOT MANAGEMENT (NEW)
  // ========================
  async adminGetAllBots() {
    try {
      const response = await api.get("/api/admin/bots");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get bots error:", error);
      return { bots: [], count: 0 };
    }
  },

  async adminRestartBot(botId) {
    try {
      const response = await api.post(`/api/admin/bots/${botId}/restart`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin restart bot error:", error);
      throw error;
    }
  },

  async adminStopBot(botId) {
    try {
      const response = await api.post(`/api/admin/bots/${botId}/stop`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin stop bot error:", error);
      throw error;
    }
  },

  async adminGetBotConfig(botId) {
    try {
      const response = await api.get(`/api/admin/bots/${botId}/config`);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin get bot config error:", error);
      return { config: {} };
    }
  },

  async adminUpdateBotConfig(botId, config) {
    try {
      const response = await api.put(`/api/admin/bots/${botId}/config`, { config });
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Admin update bot config error:", error);
      throw error;
    }
  },

  // ========================
  // WEBHOOKS
  // ========================
  async triggerBotWebhook(data) {
    try {
      const response = await api.post("/api/bot/webhook", data);
      return response.data;
    } catch (error) {
      console.error("[BotAPI] Bot webhook error:", error);
      throw error;
    }
  },

  // ========================
  // API DOCUMENTATION
  // ========================
  async getApiDocs() {
    try {
      const response = await api.get("/api/docs");
      return response.data;
    } catch (error) {
      console.error("[BotAPI] API docs error:", error);
      return { endpoints: [] };
    }
  },
};

export default BotAPI;
