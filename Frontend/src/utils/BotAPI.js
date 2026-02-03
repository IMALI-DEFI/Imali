// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key] || fallback;
  }
  if (IS_BROWSER) {
    if (window.__ENV && window.__ENV[key] !== undefined) return window.__ENV[key];
    if (window[key] !== undefined) return window[key];
    if (window.process?.env?.[key]) return window.process.env[key];
  }
  return fallback;
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function resolveApiOrigin() {
  const raw =
    getEnv("API_BASE_URL") ||
    getEnv("VITE_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE_URL") ||
    "";

  if (raw) {
    const cleaned = stripTrailingSlash(raw);
    if (cleaned.endsWith("/api")) return cleaned.slice(0, -4);
    return cleaned;
  }

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8001";
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8001";
}

/* ---------------- Token Storage ---------------- */
const TOKEN_KEY = "imali_token";

export function setAuthToken(token) {
  const t = (token || "").trim();
  if (!IS_BROWSER) return;

  if (!t) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, t);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

/* ---------------- Axios Instance ---------------- */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/* ---------------- Dev Logging ---------------- */
try {
  const isDev =
    (IS_BROWSER &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.port === "3000" ||
        window.location.port === "5173")) ||
    (!IS_BROWSER && process.env.NODE_ENV === "development");

  if (isDev) console.log(`[BotAPI] baseURL: ${BASE_URL}`);
} catch {
  // ignore
}

/* ---------------- Token Injection ---------------- */
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------------- Error Wrapper ---------------- */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.detail;
    const msg = apiMsg || err?.message || "Network or API error";
    console.error("[BotAPI] Error:", status, msg);
    const e = new Error(msg);
    e.status = status;
    throw e;
  }
}

/* ---------------- Central API Routes ---------------- */
export const BotAPI = {
  client: api,
  tryApi,

  /* Health */
  health: () => tryApi(() => api.get("/health")),

  /* Auth */
  signup: async (payload) => {
    const data = await tryApi(() => api.post("/signup", payload));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  login: async (payload) => {
    const data = await tryApi(() => api.post("/login", payload));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),

  /* Integrations */
  connectWallet: (payload) => tryApi(() => api.post("/integrations/wallet", payload)),
  connectOkx: (payload) => tryApi(() => api.post("/integrations/okx", payload)),
  connectAlpaca: (payload) => tryApi(() => api.post("/integrations/alpaca", payload)),

  /* Trading */
  tradingEnable: (enabled) => tryApi(() => api.post("/trading/enable", { enabled: !!enabled })),
  botStart: (payload = {}) => tryApi(() => api.post("/bot/start", payload)),

  /* Analytics */
  analyticsPnlSeries: (payload) => tryApi(() => api.post("/analytics/pnl/series", payload)),
  analyticsWinLoss: (payload) => tryApi(() => api.post("/analytics/winloss", payload)),
  analyticsFeesSeries: (payload) => tryApi(() => api.post("/analytics/fees/series", payload)),

  /* Billing */
  billingSetupIntent: (payload = {}) => tryApi(() => api.post("/billing/setup-intent", payload)),
  billingSetDefaultPaymentMethod: (payload) =>
    tryApi(() => api.post("/billing/set-default-payment-method", payload)),
  billingCardOnFileStatus: (payload = {}) =>
    tryApi(() => api.post("/billing/card-on-file/status", payload)),
  billingFeeHistory: (payload = {}) => tryApi(() => api.post("/billing/fee-history", payload)),
  billingCalculateFee: (payload) => tryApi(() => api.post("/billing/calculate-fee", payload)),
  billingChargeFee: (payload) => tryApi(() => api.post("/billing/charge-fee", payload)),

  /* Raw helpers */
  rawGet: async (path) => (await api.get(path)).data,
  rawPost: async (path, body = {}) => (await api.post(path, body)).data,
};

export default BotAPI;
