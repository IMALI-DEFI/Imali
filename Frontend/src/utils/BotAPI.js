// src/utils/BotAPI.js
import axios from "axios";

/* =======================
   Constants
======================= */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* =======================
   Base URL
======================= */
function stripSlash(s = "") {
  return String(s).replace(/\/+$/, "");
}

function resolveApiBase() {
  const env =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_BASE ||
    process.env.VITE_API_BASE_URL ||
    "";

  if (env) return stripSlash(env);

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      // set this to whatever your local Flask port is
      return "http://localhost:8001";
    }
  }

  return "https://api.imali-defi.com";
}

const API_BASE = resolveApiBase();
const API_ROOT = `${API_BASE}/api`;

/* =======================
   Token helpers
======================= */
export function getToken() {
  if (!IS_BROWSER) return "";
  return String(localStorage.getItem(TOKEN_KEY) || "").trim();
}

export function setToken(token) {
  if (!IS_BROWSER) return;
  const t = String(token || "").trim();
  if (!t) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, t);
}

export function clearToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

/* =======================
   Axios instance
======================= */
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* Attach auth token */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Only clear token on 401 — no hard redirects */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) clearToken();
    return Promise.reject(err);
  }
);

/* =======================
   Helpers
======================= */
function unwrap(resData) {
  // Supports: { data: {...} }, { ok: true, data: {...} }, or raw {...}
  if (resData && typeof resData === "object") {
    if (resData.data && typeof resData.data === "object") return resData.data;
  }
  return resData;
}

function extractToken(resData) {
  const top = resData?.token;
  const inner = resData?.data?.token;
  const unwrapped = unwrap(resData)?.token;
  return top || inner || unwrapped || "";
}

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

/* =======================
   Public API
======================= */
const BotAPI = {
  api,

  // token helpers
  isLoggedIn,
  getToken,
  setToken,
  clearToken,

  // meta
  apiBase: API_BASE,
  apiRoot: API_ROOT,

  // health
  health: () => request(() => api.get("/health")),

  // auth
  signup: async (payload) => {
    const resData = await request(() => api.post("/signup", payload));
    const token = extractToken(resData);
    if (token) setToken(token);
    return resData;
  },

  login: async (payload) => {
    // ✅ matches your backend: /api/auth/login
    const resData = await request(() => api.post("/auth/login", payload));
    const token = extractToken(resData);
    if (token) setToken(token);
    return resData;
  },

  walletAuth: async (payload) => {
    const resData = await request(() => api.post("/auth/wallet", payload));
    const token = extractToken(resData);
    if (token) setToken(token);
    return resData;
  },

  logout: async () => {
    clearToken();
    return true;
  },

  // user
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  // promo (if you use them elsewhere)
  promoStatus: () => request(() => api.get("/promo/status")),
  promoClaim: (p) => request(() => api.post("/promo/claim", p)),
  promoMe: () => request(() => api.get("/promo/me")),

  // billing
  billingSetupIntent: (p = {}) =>
    request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () => request(() => api.get("/billing/card-status")),

  // trading/bot
  tradingEnable: (enabled) =>
    request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => request(() => api.get("/trading/status")),
  botStart: (p = {}) => request(() => api.post("/bot/start", p)),

  // trades/analytics
  sniperTrades: () => request(() => api.get("/sniper/trades")),
  analyticsPnlSeries: (p) => request(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) => request(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) => request(() => api.post("/analytics/fees/series", p)),
};

export default BotAPI;