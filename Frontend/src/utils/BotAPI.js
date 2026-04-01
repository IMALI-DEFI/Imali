// src/utils/BotAPI.js
import axios from "axios";
const API_BASE = process.env.REACT_APP_API_BASE_URL?.replace(/\/+$/, "") || "http://129.213.90.84:3002";
const TOKEN_KEY = "imali_token";
const WS_TOKEN_KEY = "imali_ws_token";

// =========================
// RETRY CONFIGURATION
// =========================
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Helper function to check if we're on a billing-related page
const isStripePage = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path.includes('/billing') || 
         path.includes('/activation') ||
         path.includes('/signup') ||
         path.includes('/checkout') ||
         path.includes('/billing-dashboard');
};

// Helper function for retry logic
const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry auth errors on billing pages (redirect instead)
      if (error.response?.status === 401 && isStripePage()) {
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
        throw error;
      }
      
      // Don't retry auth errors
      if (error.response?.status === 401) {
        throw error;
      }
      
      // Handle rate limiting with exponential backoff
      if (error.response?.status === 429) {
        const delay = RETRY_DELAY * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Network errors - retry
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        if (i === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        continue;
      }
      
      // Other errors - don't retry
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
  throw lastError;
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

// Request interceptor for adding token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      clearToken();
      
      if (originalRequest.url !== '/api/me' && !isStripePage()) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login?expired=true';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// =========================
// TOKEN MANAGEMENT
// =========================
export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WS_TOKEN_KEY);
};

export const getWsToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WS_TOKEN_KEY);
};

export const setWsToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(WS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(WS_TOKEN_KEY);
  }
};

// =========================
// AUTH ENDPOINTS
// =========================
export const login = async (email, password) => {
  const response = await withRetry(() => 
    api.post('/api/auth/login', { email, password })
  );
  
  if (response.data?.success && response.data?.data?.token) {
    setToken(response.data.data.token);
    
    try {
      const wsResponse = await getWebSocketToken();
      if (wsResponse?.success && wsResponse?.data?.token) {
        setWsToken(wsResponse.data.token);
      }
    } catch (err) {
      console.warn('[BotAPI] Failed to get WebSocket token:', err);
    }
  }
  
  return response.data;
};

export const signup = async (userData) => {
  const response = await withRetry(() => 
    api.post('/api/signup', userData)
  );
  
  if (response.data?.success && response.data?.data?.token) {
    setToken(response.data.data.token);
  }
  
  return response.data;
};

export const logout = () => {
  clearToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const getWebSocketToken = async () => {
  const response = await withRetry(() => api.get('/api/ws/token'));
  return response.data;
};

// =========================
// USER ENDPOINTS
// =========================
export const getMe = async () => {
  const response = await withRetry(() => api.get('/api/me'));
  return response.data;
};

export const me = getMe;

export const getUserProfile = async () => {
  return getMe();
};

export const getActivationStatus = async () => {
  const response = await withRetry(() => api.get('/api/me/activation-status'));
  return response.data;
};

export const activationStatus = getActivationStatus;

// =========================
// TRADING ENDPOINTS
// =========================
export const getTrades = async (limit = 100) => {
  const response = await withRetry(() => 
    api.get(`/api/sniper/trades?limit=${limit}`)
  );
  return response.data;
};

export const getSniperTrades = getTrades;

export const getNotableTrades = async (limit = 10) => {
  const response = await withRetry(() => 
    api.get(`/api/notable-trades?limit=${limit}`)
  );
  return response.data;
};

export const getBotTrades = async (bot, limit = 50) => {
  const response = await withRetry(() => 
    api.get(`/api/bot/${bot}/trades?limit=${limit}`)
  );
  return response.data;
};

export const enableTrading = async (enabled = true) => {
  const response = await withRetry(() => 
    api.post('/api/trading/enable', { enabled })
  );
  return response.data;
};

export const startBot = async (mode = 'paper', strategy = 'ai_weighted') => {
  const response = await withRetry(() => 
    api.post('/api/bot/start', { mode, strategy })
  );
  return response.data;
};

// =========================
// BOT ENDPOINTS
// =========================
export const getBotStatus = async () => {
  const response = await withRetry(() => api.get('/api/bot/status'));
  return response.data;
};

export const getBotExecutions = async () => {
  const response = await withRetry(() => api.get('/api/bot/executions'));
  return response.data;
};

export const getBotPerformance = async (timeframe = '30d', strategy = null) => {
  const url = strategy 
    ? `/api/bot/performance?timeframe=${timeframe}&strategy=${strategy}`
    : `/api/bot/performance?timeframe=${timeframe}`;
  const response = await withRetry(() => api.get(url));
  return response.data;
};

export const getBotPositions = async () => {
  const response = await withRetry(() => api.get('/api/bot/positions'));
  return response.data;
};

// =========================
// PUBLIC DASHBOARD ENDPOINTS
// =========================
export const getPublicLiveStats = async () => {
  const response = await withRetry(() => api.get('/api/public/live-stats'));
  return response.data;
};

export const getPublicHistorical = async () => {
  const response = await withRetry(() => api.get('/api/public/historical'));
  return response.data;
};

export const getRecentTrades = async (limit = 50) => {
  const response = await withRetry(() => 
    api.get(`/api/trades/recent?limit=${limit}`)
  );
  return response.data;
};

export const getBotActivityHistory = async (days = 30, limit = 500) => {
  const response = await withRetry(() => 
    api.get(`/api/bot-activity/history?days=${days}&limit=${limit}`)
  );
  return response.data;
};

// =========================
// ANALYTICS ENDPOINTS
// =========================
export const getAnalyticsSummary = async () => {
  const response = await withRetry(() => api.get('/api/analytics/summary'));
  return response.data;
};

export const getPnlAnalytics = async (period = '30d', interval = 'daily', chartType = 'line') => {
  const response = await withRetry(() => 
    api.get(`/api/analytics/pnl?period=${period}&interval=${interval}&chartType=${chartType}`)
  );
  return response.data;
};

export const getWinLossAnalytics = async (period = '30d') => {
  const response = await withRetry(() => 
    api.get(`/api/analytics/winloss?period=${period}`)
  );
  return response.data;
};

export const getFeeAnalytics = async (period = '30d') => {
  const response = await withRetry(() => 
    api.get(`/api/analytics/fees?period=${period}`)
  );
  return response.data;
};

// =========================
// BILLING ENDPOINTS
// =========================
export const getSetupIntent = async () => {
  const response = await withRetry(() => api.post('/api/billing/setup-intent'));
  return response.data;
};

export const confirmCard = async () => {
  const response = await withRetry(() => api.post('/api/billing/confirm-card'));
  return response.data;
};

export const getCardStatus = async () => {
  const response = await withRetry(() => api.get('/api/billing/card-status'));
  return response.data;
};

export const setDefaultPaymentMethod = async (paymentMethodId, customerId) => {
  const response = await withRetry(() => 
    api.post('/api/billing/set-default-payment', { payment_method_id: paymentMethodId, customer_id: customerId })
  );
  return response.data;
};

export const getSubscription = async () => {
  const response = await withRetry(() => api.get('/api/billing/subscription'));
  return response.data;
};

export const createSubscription = async (tier) => {
  const response = await withRetry(() => 
    api.post('/api/billing/subscription/create', { tier })
  );
  return response.data;
};

export const cancelSubscription = async (cancelAtPeriodEnd = true, reason = '') => {
  const response = await withRetry(() => 
    api.post('/api/billing/subscription/cancel', { cancel_at_period_end: cancelAtPeriodEnd, reason })
  );
  return response.data;
};

export const updateSubscription = async (newTier) => {
  const response = await withRetry(() => 
    api.post('/api/billing/subscription/update', { tier: newTier })
  );
  return response.data;
};

export const getInvoices = async (limit = 12) => {
  const response = await withRetry(() => 
    api.get(`/api/billing/invoices?limit=${limit}`)
  );
  return response.data;
};

export const getUpcomingInvoice = async (newTier = null) => {
  const url = newTier 
    ? `/api/billing/upcoming-invoice?new_tier=${newTier}`
    : '/api/billing/upcoming-invoice';
  const response = await withRetry(() => api.get(url));
  return response.data;
};

export const createPortalSession = async () => {
  const response = await withRetry(() => api.post('/api/billing/portal'));
  return response.data;
};

export const calculateFee = async (pnlUsd, portfolioValue = null, tradeId = null) => {
  const response = await withRetry(() => 
    api.post('/api/billing/calculate-fee', { pnl_usd: pnlUsd, portfolio_value: portfolioValue, trade_id: tradeId })
  );
  return response.data;
};

export const chargeFee = async (feeAmount, description, tradeId = null, pnlUsd = null, portfolioValue = null) => {
  const response = await withRetry(() => 
    api.post('/api/billing/charge-fee', { fee_amount: feeAmount, description, trade_id: tradeId, pnl_usd: pnlUsd, portfolio_value: portfolioValue })
  );
  return response.data;
};

export const getFeeHistory = async () => {
  const response = await withRetry(() => api.get('/api/billing/fee-history'));
  return response.data;
};

// =========================
// REFERRAL ENDPOINTS
// =========================
export const getReferralInfo = async () => {
  const response = await withRetry(() => api.get('/api/referrals/info'));
  return response.data;
};

export const getReferralStats = async () => {
  const response = await withRetry(() => api.get('/api/referrals/stats'));
  return response.data;
};

export const getReferralHistory = async () => {
  const response = await withRetry(() => api.get('/api/referrals/history'));
  return response.data;
};

export const validateReferralCode = async (code) => {
  const response = await withRetry(() => 
    api.post('/api/referrals/validate', { code })
  );
  return response.data;
};

export const applyReferralCode = async (code) => {
  const response = await withRetry(() => 
    api.post('/api/referrals/apply', { code })
  );
  return response.data;
};

export const claimReferralRewards = async (amount, walletAddress, claimAll = false) => {
  const response = await withRetry(() => 
    api.post('/api/referrals/claim', { amount, wallet_address: walletAddress, claim_all: claimAll })
  );
  return response.data;
};

export const getReferralLinkStats = async (timeframe = '30d') => {
  const response = await withRetry(() => 
    api.get(`/api/referrals/link-stats?timeframe=${timeframe}`)
  );
  return response.data;
};

export const getReferralLeaderboard = async (timeframe = 'all_time', sortBy = 'count', limit = 50) => {
  const response = await withRetry(() => 
    api.get(`/api/referrals/leaderboard?timeframe=${timeframe}&sort_by=${sortBy}&limit=${limit}`)
  );
  return response.data;
};

// =========================
// DISCOVERY ENDPOINTS
// =========================
export const getDiscoveries = async (limit = 20) => {
  const response = await withRetry(() => 
    api.get(`/api/sniper/discoveries?limit=${limit}`)
  );
  return response.data;
};

// =========================
// PROMO ENDPOINTS
// =========================
export const getPromoStatus = async () => {
  const response = await withRetry(() => api.get('/api/promo/status'));
  return response.data;
};

export const claimPromo = async (email, tier = 'starter', wallet = null) => {
  const response = await withRetry(() => 
    api.post('/api/promo/claim', { email, tier, wallet })
  );
  return response.data;
};

export const getMyPromoStatus = async () => {
  const response = await withRetry(() => api.get('/api/promo/me'));
  return response.data;
};

export const applyPromoCode = async (code) => {
  const response = await withRetry(() => 
    api.post('/api/promo/apply', { code })
  );
  return response.data;
};

// =========================
// WAITLIST ENDPOINTS
// =========================
export const joinWaitlist = async (email, tier = 'starter') => {
  const response = await withRetry(() => 
    api.post('/api/waitlist', { email, tier })
  );
  return response.data;
};

export const getWaitlistPosition = async (email) => {
  const response = await withRetry(() => 
    api.get(`/api/waitlist/position?email=${encodeURIComponent(email)}`)
  );
  return response.data;
};

// =========================
// ANNOUNCEMENT ENDPOINTS
// =========================
export const getAnnouncements = async () => {
  const response = await withRetry(() => api.get('/api/announcements'));
  return response.data;
};

export const markAnnouncementRead = async (announcementId) => {
  const response = await withRetry(() => 
    api.post(`/api/announcements/${announcementId}/read`)
  );
  return response.data;
};

// =========================
// SUPPORT TICKET ENDPOINTS
// =========================
export const createSupportTicket = async (subject, message, priority = 'normal') => {
  const response = await withRetry(() => 
    api.post('/api/support/tickets', { subject, message, priority })
  );
  return response.data;
};

export const getSupportTickets = async () => {
  const response = await withRetry(() => api.get('/api/support/tickets'));
  return response.data;
};

export const getSupportTicket = async (ticketId) => {
  const response = await withRetry(() => 
    api.get(`/api/support/tickets/${ticketId}`)
  );
  return response.data;
};

export const addTicketMessage = async (ticketId, message) => {
  const response = await withRetry(() => 
    api.post(`/api/support/tickets/${ticketId}/messages`, { message })
  );
  return response.data;
};

// =========================
// WITHDRAWAL ENDPOINTS
// =========================
export const createWithdrawal = async (amount, method, address) => {
  const response = await withRetry(() => 
    api.post('/api/withdrawals', { amount, method, address })
  );
  return response.data;
};

export const getWithdrawals = async () => {
  const response = await withRetry(() => api.get('/api/withdrawals'));
  return response.data;
};

// =========================
// EXPORT ENDPOINTS
// =========================
export const exportTrades = async (format = 'csv', startDate = null, endDate = null) => {
  let url = `/api/export/trades?format=${format}`;
  if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
  if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
  
  const response = await withRetry(() => api.get(url, { responseType: 'blob' }));
  return response.data;
};

// =========================
// UTILITY FUNCTIONS
// =========================
export const checkHealth = async () => {
  const response = await withRetry(() => api.get('/api/health'));
  return response.data;
};

export const checkAdmin = async () => {
  const response = await withRetry(() => api.get('/api/admin/check'));
  return response.data;
};

// =========================
// CLASS WRAPPER FOR BACKWARD COMPATIBILITY
// =========================
class BotAPIClass {
  constructor() {
    this.api = api;
  }

  setToken(token) {
    setToken(token);
  }

  getToken() {
    return getToken();
  }

  clearToken() {
    clearToken();
  }

  async login(email, password) {
    return login(email, password);
  }

  async signup(userData) {
    return signup(userData);
  }

  async logout() {
    logout();
  }

  async getMe() {
    return getMe();
  }

  async me() {
    return getMe();
  }

  async getActivationStatus() {
    return getActivationStatus();
  }

  async activationStatus() {
    return getActivationStatus();
  }

  async getWebSocketToken() {
    return getWebSocketToken();
  }

  async getTrades(limit = 100) {
    return getTrades(limit);
  }

  async getSniperTrades(limit = 100) {
    return getSniperTrades(limit);
  }

  async getDiscoveries(limit = 20) {
    return getDiscoveries(limit);
  }

  async getBotStatus() {
    return getBotStatus();
  }

  async getAnalyticsSummary() {
    return getAnalyticsSummary();
  }

  async getPublicHistorical() {
    return getPublicHistorical();
  }

  async getPublicLiveStats() {
    return getPublicLiveStats();
  }

  async getReferralInfo() {
    return getReferralInfo();
  }

  async getReferralStats() {
    return getReferralStats();
  }

  async validateReferralCode(code) {
    return validateReferralCode(code);
  }

  async applyReferralCode(code) {
    return applyReferralCode(code);
  }

  async claimReferralRewards(amount, walletAddress, claimAll = false) {
    return claimReferralRewards(amount, walletAddress, claimAll);
  }
}

// Create singleton instance
const BotAPI = new BotAPIClass();

// Export both the class instance and individual functions
export default BotAPI;
