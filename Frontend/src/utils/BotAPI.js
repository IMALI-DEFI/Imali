// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   API Base Resolver (single source of truth)
   - Uses env if present, otherwise localhost, otherwise prod
====================================================== */
function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function resolveApiBase() {
  const env =
    (typeof process !== "undefined" && process.env && (
      process.env.REACT_APP_API_BASE_URL ||
      process.env.REACT_APP_API_BASE ||
      process.env.VITE_API_BASE_URL
    )) || "";

  if (env) return stripTrailingSlash(env);

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      // ✅ match your local backend port
      return "http://localhost:8001";
    }
  }

  return "https://api.imali-defi.com";
}

const API_BASE = resolveApiBase();
const API_ROOT = `${stripTrailingSlash(API_BASE)}/api`;

/* ======================================================
   Token Helpers
====================================================== */
function safeGetToken() {
  if (!IS_BROWSER) return "";
  try {
    return String(localStorage.getItem(TOKEN_KEY) || "").trim();
  } catch {
    return "";
  }
}

function safeSetToken(token) {
  if (!IS_BROWSER) return;
  try {
    const clean = String(token || "").trim();
    if (!clean) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, clean);
  } catch {
    /* noop */
  }
}

function safeClearToken() {
  if (!IS_BROWSER) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

/* ======================================================
   Axios Instance
====================================================== */
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* ======================================================
   Interceptors
   - Adds Bearer token
   - Clears token on 401
   - NO forced redirects (prevents surprise blank pages)
====================================================== */
api.interceptors.request.use((config) => {
  const token = safeGetToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) safeClearToken();
    return Promise.reject(err);
  }
);

/* ======================================================
   Error Normalizer
====================================================== */
async function request(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    const message =
      data?.message ||
      data?.detail ||
      data?.error ||
      err?.message ||
      "Request failed";

    const e = new Error(message);
    e.status = status;
    e.data = data;
    throw e;
  }
}

/* ======================================================
   Public API
====================================================== */
export const BotAPI = {
  // meta
  api,
  API_BASE,
  API_ROOT,

  // token helpers (exposed)
  getToken: safeGetToken,
  setToken: safeSetToken,
  clearToken: safeClearToken,
  isLoggedIn: () => !!safeGetToken(),

  // health
  health: () => request(() => api.get("/health")),

  // auth
  signup: async (payload) => {
    const data = await request(() => api.post("/signup", payload));
    // expect { token } or { data: { token } } depending on backend
    const token = data?.token || data?.data?.token;
    if (token) safeSetToken(token);
    return data;
  },

  // IMPORTANT: choose the endpoint your backend actually exposes.
  // If your api_main.py route is /api/login, keep this as "/login".
  login: async (payload) => {
    const data = await request(() => api.post("/login", payload));
    const token = data?.token || data?.data?.token;
    if (token) safeSetToken(token);
    return data;
  },

  // optional alias if some older UI still calls /auth/login
  loginAuth: async (payload) => {
    const data = await request(() => api.post("/auth/login", payload));
    const token = data?.token || data?.data?.token;
    if (token) safeSetToken(token);
    return data;
  },

  logout: async () => {
    safeClearToken();
    return true;
  },

  // user
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  // billing
  billingSetupIntent: (p = {}) => request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: (p = {}) => request(() => api.get("/billing/card-status", { params: p })),

  // trading
  tradingEnable: (enabled) => request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => request(() => api.get("/trading/status")),

  // bot
  botStart: (p = {}) => request(() => api.post("/bot/start", p)),

  // trades
  sniperTrades: () => request(() => api.get("/sniper/trades")),

  // analytics
  analyticsPnlSeries: (p) => request(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) => request(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) => request(() => api.post("/analytics/fees/series", p)),
};

export default BotAPI;