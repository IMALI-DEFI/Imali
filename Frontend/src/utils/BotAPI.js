// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   API Base Resolver (single source of truth)
====================================================== */
function resolveApiBase() {
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
function readToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

function writeToken(token) {
  if (!IS_BROWSER) return;
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

function dropToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

/* Try to locate token in any common response shape */
function extractToken(payload) {
  if (!payload) return "";
  return (
    payload.token ||
    payload.access_token ||
    payload.accessToken ||
    payload.data?.token ||
    payload.data?.access_token ||
    payload.data?.accessToken ||
    payload?.data?.data?.token || // some APIs wrap twice
    ""
  );
}

/* ======================================================
   Axios Instance
====================================================== */
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // only clear token; do not redirect from here
      dropToken();
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
    return res.data; // IMPORTANT: always return payload only
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
const BotAPI = {
  // meta
  api,
  isLoggedIn: () => !!readToken(),
  getToken: () => readToken(),
  setToken: (t) => writeToken(t),
  clearToken: () => dropToken(),
  logout: () => {
    dropToken();
    return Promise.resolve();
  },

  // health
  health: () => request(() => api.get("/health")),

  // auth (MATCHES YOUR BACKEND)
  signup: (p) =>
    request(async () => {
      const payload = await request(() => api.post("/signup", p));
      const token = extractToken(payload);
      if (token) writeToken(token);
      return payload;
    }),

  login: (p) =>
    request(async () => {
      const payload = await request(() => api.post("/auth/login", p));
      const token = extractToken(payload);
      if (token) writeToken(token);
      return payload;
    }),

  walletAuth: (p) =>
    request(async () => {
      const payload = await request(() => api.post("/auth/wallet", p));
      const token = extractToken(payload);
      if (token) writeToken(token);
      return payload;
    }),

  // user
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  // billing
  billingSetupIntent: (p = {}) => request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () => request(() => api.get("/billing/card-status")),

  // trading
  tradingEnable: (enabled) =>
    request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => request(() => api.get("/trading/status")),

  // bot
  botStart: (p = {}) => request(() => api.post("/bot/start", p)),

  // trades
  sniperTrades: () => request(() => api.get("/sniper/trades")),

  // analytics
  analyticsPnlSeries: (p) => request(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) => request(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) => request(() => api.post("/analytics/fees/series", p)),

  // optional: keep these so your Signup page doesn’t explode if still referenced
  promoStatus: () => Promise.resolve({ active: false, available: false }),
  promoClaim: () => Promise.resolve({ ok: true }),
};

// ✅ supports BOTH:
// import BotAPI from "../utils/BotAPI"
// import { BotAPI } from "../utils/BotAPI"
export { BotAPI };
export default BotAPI;
