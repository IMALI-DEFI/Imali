// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   API Base Resolver (SINGLE source of truth)
====================================================== */
function resolveApiBase() {
  // Priority: explicit env → localhost → prod
  const env =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_API_BASE ||
    process.env.VITE_API_BASE_URL ||
    "";

  if (env) return env.replace(/\/+$/, "");

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8001";
    }
  }

  return "https://api.imali-defi.com";
}

const API_BASE = resolveApiBase();
const API_ROOT = `${API_BASE}/api`;

/* ======================================================
   Token Helpers
====================================================== */
export function getToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token) {
  if (!IS_BROWSER) return;
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
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
   Request Interceptor (auth only)
====================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ======================================================
   Response Interceptor (NO forced redirects)
====================================================== */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // Only clear token on auth failure
    if (status === 401) {
      clearToken();
    }

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
      err.message ||
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
const BotAPI = {
  /* ---------- Meta ---------- */
  api,
  isLoggedIn,
  getToken,
  setToken,
  clearToken,

  /* ---------- Health ---------- */
  health: () => request(() => api.get("/health")),

  /* ---------- Auth ---------- */
  signup: (p) =>
    request(async () => {
      const data = await api.post("/signup", p);
      if (data?.data?.token) setToken(data.data.token);
      return data;
    }),

  login: (p) =>
    request(async () => {
      const data = await api.post("/login", p);
      if (data?.data?.token) setToken(data.data.token);
      return data;
    }),

  logout: () => {
    clearToken();
    return Promise.resolve();
  },

  /* ---------- User ---------- */
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  /* ---------- Billing ---------- */
  billingSetupIntent: (p = {}) =>
    request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () =>
    request(() => api.get("/billing/card-status")),

  /* ---------- Trading ---------- */
  tradingEnable: (enabled) =>
    request(() =>
      api.post("/trading/enable", { enabled: !!enabled })
    ),
  tradingStatus: () =>
    request(() => api.get("/trading/status")),

  /* ---------- Bot ---------- */
  botStart: (p = {}) =>
    request(() => api.post("/bot/start", p)),

  /* ---------- Trades ---------- */
  sniperTrades: () =>
    request(() => api.get("/sniper/trades")),

  /* ---------- Analytics ---------- */
  analyticsPnlSeries: (p) =>
    request(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) =>
    request(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) =>
    request(() => api.post("/analytics/fees/series", p)),
};

export default BotAPI;
