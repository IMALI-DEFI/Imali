import axios from "axios";

const API_BASE =
  (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const TOKEN_KEY = "imali_token";
const WS_TOKEN_KEY = "imali_ws_token";

const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

const isBrowser = typeof window !== "undefined";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (fn, retries = MAX_RETRIES) => {
  let lastError;

  for (let i = 0; i <= retries; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;

      if (status === 401 || status === 403) throw error;

      if (status === 429) {
        await sleep(RETRY_DELAY * Math.pow(2, i));
        continue;
      }

      if (error?.code === "ECONNABORTED" || error?.message === "Network Error") {
        if (i === retries) break;
        await sleep(RETRY_DELAY * (i + 1));
        continue;
      }

      if (i === retries) break;
      await sleep(RETRY_DELAY * (i + 1));
    }
  }

  throw lastError;
};

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export const getToken = () => {
  if (!isBrowser) return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (!isBrowser) return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

export const getWsToken = () => {
  if (!isBrowser) return null;
  return localStorage.getItem(WS_TOKEN_KEY);
};

export const setWsToken = (token) => {
  if (!isBrowser) return;
  if (token) localStorage.setItem(WS_TOKEN_KEY, token);
  else localStorage.removeItem(WS_TOKEN_KEY);
};

export const clearToken = () => {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(WS_TOKEN_KEY);
};

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

const unwrap = (response) => response?.data ?? response;

/* =========================
   AUTH
========================= */

export const login = async (email, password) => {
  const response = await withRetry(() =>
    api.post("/api/auth/login", { email, password })
  );
  const data = unwrap(response);

  const token = data?.data?.token || data?.token || null;
  if (token) {
    setToken(token);
    try {
      const ws = await getWebSocketToken();
      const wsToken = ws?.data?.token || ws?.token || null;
      if (wsToken) setWsToken(wsToken);
    } catch (err) {
      console.warn("[BotAPI] Failed to fetch websocket token:", err);
    }
  }

  return data;
};

export const signup = async (userData) => {
  const response = await withRetry(() => api.post("/api/signup", userData));
  const data = unwrap(response);

  const token = data?.data?.token || data?.token || null;
  if (token) {
    setToken(token);
  }

  return data;
};

export const logout = () => {
  clearToken();
  if (isBrowser) window.location.href = "/login";
};

export const getMe = async () => {
  const response = await withRetry(() => api.get("/api/me"));
  return unwrap(response);
};

export const me = getMe;

export const getActivationStatus = async () => {
  const response = await withRetry(() => api.get("/api/me/activation-status"));
  return unwrap(response);
};

export const activationStatus = getActivationStatus;

export const getWebSocketToken = async () => {
  const response = await withRetry(() => api.get("/api/ws/token"));
  return unwrap(response);
};

/* =========================
   BILLING
========================= */

export const getCardStatus = async () => {
  const response = await withRetry(() => api.get("/api/billing/card-status"));
  return unwrap(response);
};

export const createSetupIntent = async (payload = {}) => {
  const response = await withRetry(() =>
    api.post("/api/billing/setup-intent", payload)
  );
  return unwrap(response);
};

/* =========================
   INTEGRATIONS
========================= */

export const connectWallet = async (payload) => {
  const response = await withRetry(() =>
    api.post("/api/integrations/wallet", payload)
  );
  return unwrap(response);
};

export const connectOKX = async (payload) => {
  const response = await withRetry(() =>
    api.post("/api/integrations/okx", payload)
  );
  return unwrap(response);
};

export const connectAlpaca = async (payload) => {
  const response = await withRetry(() =>
    api.post("/api/integrations/alpaca", payload)
  );
  return unwrap(response);
};

/* =========================
   TRADING
========================= */

export const toggleTrading = async (enabled) => {
  const response = await withRetry(() =>
    api.post("/api/trading/enable", { enabled })
  );
  return unwrap(response);
};

export const startBot = async (mode = "paper", strategy = "ai_weighted") => {
  const response = await withRetry(() =>
    api.post("/api/bot/start", { mode, strategy })
  );
  return unwrap(response);
};

/* =========================
   DASHBOARD / ANALYTICS
========================= */

export const getTrades = async (limit = 100) => {
  const response = await withRetry(() =>
    api.get(`/api/sniper/trades?limit=${limit}`)
  );
  return unwrap(response);
};

export const getSniperTrades = getTrades;

export const getDiscoveries = async (limit = 20) => {
  const response = await withRetry(() =>
    api.get(`/api/sniper/discoveries?limit=${limit}`)
  );
  return unwrap(response);
};

export const getBotStatus = async () => {
  const response = await withRetry(() => api.get("/api/bot/status"));
  return unwrap(response);
};

export const getAnalyticsSummary = async () => {
  const response = await withRetry(() => api.get("/api/analytics/summary"));
  return unwrap(response);
};

export const getPublicLiveStats = async () => {
  const response = await withRetry(() => api.get("/api/public/live-stats"));
  return unwrap(response);
};

export const getPublicHistorical = async () => {
  const response = await withRetry(() => api.get("/api/public/historical"));
  return unwrap(response);
};

export const forgotPassword = async (email) => {
  const response = await withRetry(() =>
    api.post("/api/auth/forgot-password", { email })
  );
  return unwrap(response);
};

export const getPromoStatus = async () => {
  const response = await withRetry(() => api.get("/api/promo/status"));
  return unwrap(response);
};

export const claimPromo = async (email, tier = "starter", wallet = null) => {
  const response = await withRetry(() =>
    api.post("/api/promo/claim", { email, tier, wallet })
  );
  return unwrap(response);
};

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

  login(email, password) {
    return login(email, password);
  }

  signup(userData) {
    return signup(userData);
  }

  logout() {
    return logout();
  }

  getMe() {
    return getMe();
  }

  me() {
    return getMe();
  }

  getActivationStatus() {
    return getActivationStatus();
  }

  activationStatus() {
    return getActivationStatus();
  }

  getWebSocketToken() {
    return getWebSocketToken();
  }

  getCardStatus() {
    return getCardStatus();
  }

  createSetupIntent(payload) {
    return createSetupIntent(payload);
  }

  connectWallet(payload) {
    return connectWallet(payload);
  }

  connectOKX(payload) {
    return connectOKX(payload);
  }

  connectAlpaca(payload) {
    return connectAlpaca(payload);
  }

  toggleTrading(enabled) {
    return toggleTrading(enabled);
  }

  startBot(mode, strategy) {
    return startBot(mode, strategy);
  }

  getTrades(limit = 100) {
    return getTrades(limit);
  }

  getSniperTrades(limit = 100) {
    return getSniperTrades(limit);
  }

  getDiscoveries(limit = 20) {
    return getDiscoveries(limit);
  }

  getBotStatus() {
    return getBotStatus();
  }

  getAnalyticsSummary() {
    return getAnalyticsSummary();
  }

  getPublicLiveStats() {
    return getPublicLiveStats();
  }

  getPublicHistorical() {
    return getPublicHistorical();
  }

  forgotPassword(email) {
    return forgotPassword(email);
  }

  getPromoStatus() {
    return getPromoStatus();
  }

  claimPromo(email, tier, wallet) {
    return claimPromo(email, tier, wallet);
  }
}

const BotAPI = new BotAPIClass();
export default BotAPI;
