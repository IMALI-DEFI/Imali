// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Environment Helpers
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

function getEnv(key, fallback = "") {
  if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
    return process.env[key] || fallback;
  }

  if (IS_BROWSER) {
    if (window.__ENV?.[key] !== undefined) return window.__ENV[key];
    if (window[key] !== undefined) return window[key];
    if (window.process?.env?.[key]) return window.process.env[key];
  }

  return fallback;
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

/* ======================================================
   API Origin Resolver (single source of truth)
====================================================== */
function resolveApiOrigin() {
  const raw =
    getEnv("API_BASE_URL") ||
    getEnv("VITE_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE") ||
    "";

  if (raw) {
    const cleaned = stripTrailingSlash(raw);
    return cleaned.endsWith("/api") ? cleaned.slice(0, -4) : cleaned;
  }

  if (IS_BROWSER) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:8001";
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8001";
}

/* ======================================================
   Token Normalization (CRITICAL FIX)
====================================================== */
function normalizeJwt(token) {
  if (!token) return "";
  return token.startsWith("jwt:") ? token.slice(4) : token;
}

export function setAuthToken(token) {
  if (!IS_BROWSER) return;

  const clean = normalizeJwt(String(token || "").trim());
  if (!clean) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, clean);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return normalizeJwt(localStorage.getItem(TOKEN_KEY) || "");
}

export function clearAuthToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

/* ======================================================
   Axios Instance
====================================================== */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ======================================================
   Dev Logging
====================================================== */
try {
  const isDev =
    (IS_BROWSER &&
      ["localhost", "127.0.0.1"].includes(window.location.hostname)) ||
    (!IS_BROWSER && process.env.NODE_ENV === "development");

  if (isDev) {
    console.log("[BotAPI] API Origin:", API_ORIGIN);
    console.log("[BotAPI] Base URL:", BASE_URL);
  }
} catch {
  /* noop */
}

/* ======================================================
   Auth Injection (FIXED)
====================================================== */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
   Unified Error Wrapper
====================================================== */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.message ||
      "API request failed";

    console.error("[BotAPI]", status, message);

    const e = new Error(message);
    e.status = status;

    if (status === 401 || status === 403) {
      clearAuthToken();
    }

    throw e;
  }
}

/* ======================================================
   Centralized API Interface
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,

  /* ---------------- Health ---------------- */
  health: () => tryApi(() => api.get("/health")),

  /* ---------------- Auth ---------------- */
  signup: async (payload) => {
    const data = await tryApi(() => api.post("/signup", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  login: async (payload) => {
    const data = await tryApi(() => api.post("/login", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  logout: () => {
    clearAuthToken();
  },

  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),

  /* ---------------- Integrations ---------------- */
  connectWallet: (payload) =>
    tryApi(() => api.post("/integrations/wallet", payload)),

  connectOkx: (payload) =>
    tryApi(() => api.post("/integrations/okx", payload)),

  connectAlpaca: (payload) =>
    tryApi(() => api.post("/integrations/alpaca", payload)),

  /* ---------------- Trading ---------------- */
  tradingEnable: (enabled) =>
    tryApi(() => api.post("/trading/enable", { enabled: !!enabled })),

  botStart: (payload = {}) =>
    tryApi(() => api.post("/bot/start", payload)),

  /* ---------------- Analytics ---------------- */
  analyticsPnlSeries: (payload) =>
    tryApi(() => api.post("/analytics/pnl/series", payload)),

  analyticsWinLoss: (payload) =>
    tryApi(() => api.post("/analytics/winloss", payload)),

  analyticsFeesSeries: (payload) =>
    tryApi(() => api.post("/analytics/fees/series", payload)),

  /* ---------------- Billing ---------------- */
  billingSetupIntent: (payload = {}) =>
    tryApi(() => api.post("/billing/setup-intent", payload)),

  billingSetDefaultPaymentMethod: (payload) =>
    tryApi(() => api.post("/billing/set-default-payment-method", payload)),

  billingCardOnFileStatus: (payload = {}) =>
    tryApi(() => api.post("/billing/card-on-file/status", payload)),

  billingFeeHistory: (payload = {}) =>
    tryApi(() => api.post("/billing/fee-history", payload)),

  billingCalculateFee: (payload) =>
    tryApi(() => api.post("/billing/calculate-fee", payload)),

  billingChargeFee: (payload) =>
    tryApi(() => api.post("/billing/charge-fee", payload)),

  /* ---------------- Raw Helpers ---------------- */
  rawGet: async (path) => (await api.get(path)).data,
  rawPost: async (path, body = {}) => (await api.post(path, body)).data,
};

export default BotAPI;
