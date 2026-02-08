// src/utils/BotAPI.js
import axios from "axios";

/* =========================
   Constants
========================= */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* =========================
   API base resolver
========================= */
function resolveApiBase() {
  const env =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_BASE ||
    process.env.VITE_API_BASE_URL ||
    "";

  if (env) return String(env).replace(/\/+$/, "");

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      // match whatever your local api_main.py runs on (change if needed)
      return "http://localhost:8001";
    }
  }

  return "https://api.imali-defi.com";
}

const API_BASE = resolveApiBase();
const API_ROOT = `${API_BASE}/api`;

/* =========================
   Token helpers
========================= */
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

/* =========================
   Axios instance
========================= */
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // don't force redirects here (that can cause "blank" loops)
    if (err?.response?.status === 401) clearToken();
    return Promise.reject(err);
  }
);

/* =========================
   Helpers
========================= */
function unwrap(payload) {
  // Your backend uses success_response({ ... }) often.
  // Common shapes:
  // 1) { ok: true, data: {...}, message: "..." }
  // 2) { token: "...", user: {...} }
  // 3) { user: {...} }
  if (payload && typeof payload === "object" && payload.data && payload.ok !== undefined) {
    return payload.data;
  }
  return payload;
}

function extractToken(payload) {
  const p = payload || {};
  return (
    p.token ||
    p.access_token ||
    p.accessToken ||
    p.data?.token ||
    p.data?.data?.token ||
    null
  );
}

async function request(fn) {
  try {
    const res = await fn();
    return unwrap(res.data);
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

/* =========================
   Public API
========================= */
export const BotAPI = {
  api,
  isLoggedIn,
  getToken,
  setToken,
  clearToken,

  /* Health */
  health: () => request(() => api.get("/health")),

  /* Auth */
  signup: async (p) => {
    const data = await request(() => api.post("/signup", p));
    const token = extractToken(data);
    if (token) setToken(token);
    return data;
  },

  // IMPORTANT: backend route is /api/auth/login (not /api/login)
  login: async (p) => {
    const data = await request(() => api.post("/auth/login", p));
    const token = extractToken(data);
    if (token) setToken(token);
    return data;
  },

  walletAuth: async (p) => {
    const data = await request(() => api.post("/auth/wallet", p));
    const token = extractToken(data);
    if (token) setToken(token);
    return data;
  },

  logout: async () => {
    clearToken();
    return true;
  },

  /* User */
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  /* Billing */
  billingSetupIntent: (p = {}) => request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () => request(() => api.get("/billing/card-status")),

  /* Trading */
  tradingEnable: (enabled) =>
    request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => request(() => api.get("/trading/status")),

  /* Bot */
  botStart: (p = {}) => request(() => api.post("/bot/start", p)),

  /* Trades */
  sniperTrades: () => request(() => api.get("/sniper/trades")),

  /* Analytics */
  analyticsPnlSeries: (p) => request(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) => request(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) => request(() => api.post("/analytics/fees/series", p)),
};

export default BotAPI;