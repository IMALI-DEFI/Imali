// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Environment Helpers
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

function getEnv(key, fallback = "") {
  try {
    if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
      return process.env[key] || fallback;
    }

    if (IS_BROWSER) {
      if (window.__ENV?.[key] !== undefined) return window.__ENV[key];
      if (window[key] !== undefined) return window[key];
      if (window.process?.env?.[key]) return window.process.env[key];
    }
  } catch {
    /* noop */
  }

  return fallback;
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

/* ======================================================
   API Origin Resolver
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
      return "http://localhost:8080";
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8080";
}

/* ======================================================
   Token Management
====================================================== */
export function setAuthToken(token) {
  if (!IS_BROWSER) return;

  const clean = String(token || "").trim();
  if (!clean) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, clean);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return String(localStorage.getItem(TOKEN_KEY) || "").trim();
}

export function clearAuthToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getAuthToken();
}

/* ======================================================
   Axios Instance
====================================================== */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* ======================================================
   Dev Logging
====================================================== */
if (
  IS_BROWSER &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname)
) {
  console.log("[BotAPI] API Origin:", API_ORIGIN);
  console.log("[BotAPI] Base URL:", BASE_URL);
  console.log("[BotAPI] Token present:", !!getAuthToken());
}

/* ======================================================
   Request Interceptor
====================================================== */
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API →] ${config.method?.toUpperCase()} ${config.url}`,
        config.data || ""
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ======================================================
   Response Interceptor
====================================================== */
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[API ←] ${response.config?.method?.toUpperCase()} ${response.config?.url}`,
        response.status
      );
    }
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url;
    const method = error?.config?.method;

    console.error(
      `[API ERROR] ${method?.toUpperCase()} ${url} (${status})`,
      error?.response?.data
    );

    if (
      status === 401 &&
      IS_BROWSER &&
      !window.location.pathname.startsWith("/login")
    ) {
      clearAuthToken();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

/* ======================================================
   Error Wrapper
====================================================== */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    let message =
      data?.message ||
      data?.error ||
      data?.detail ||
      err?.message ||
      "Request failed";

    if (status === 404) {
      message = `Endpoint not found`;
    } else if (status === 500) {
      message = "Server error. Please try again later.";
    } else if (status === 409) {
      message = "Account already exists";
    }

    const e = new Error(message);
    e.status = status;
    e.data = data;
    throw e;
  }
}

/* ======================================================
   Centralized API Interface
====================================================== */
export const BotAPI = {
  client: api,
  tryApi,
  isLoggedIn,
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,

  /* Health */
  health: () => tryApi(() => api.get("/health")),
  systemInfo: () => tryApi(() => api.get("/system/info")),

  /* Auth */
  signup: async (payload) => {
    const data = await tryApi(() => api.post("/signup", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  login: async (payload) => {
    const data = await tryApi(() => api.post("/auth/login", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  walletAuth: async (payload) => {
    const data = await tryApi(() => api.post("/auth/wallet", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  logout: () => clearAuthToken(),

  /* User */
  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),
  permissions: () => tryApi(() => api.get("/me/permissions")),

  /* Promo */
  promoStatus: () => tryApi(() => api.get("/promo/status")),
  promoClaim: (p) => tryApi(() => api.post("/promo/claim", p)),
  promoMe: () => tryApi(() => api.get("/promo/me")),

  /* Integrations */
  connectWallet: (p) => tryApi(() => api.post("/integrations/wallet", p)),
  connectOkx: (p) => tryApi(() => api.post("/integrations/okx", p)),
  connectAlpaca: (p) => tryApi(() => api.post("/integrations/alpaca", p)),
  integrationStatus: () => tryApi(() => api.get("/integrations/status")),

  /* Trading */
  tradingEnable: (enabled) =>
    tryApi(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => tryApi(() => api.get("/trading/status")),

  /* Bot */
  botStart: (p = {}) => tryApi(() => api.post("/bot/start", p)),

  /* Trades */
  sniperTrades: () => tryApi(() => api.get("/sniper/trades")),

  /* Analytics */
  analyticsPnlSeries: (p) =>
    tryApi(() => api.post("/analytics/pnl/series", p)),
  analyticsWinLoss: (p) =>
    tryApi(() => api.post("/analytics/winloss", p)),
  analyticsFeesSeries: (p) =>
    tryApi(() => api.post("/analytics/fees/series", p)),

  /* Billing */
  billingSetupIntent: (p = {}) =>
    tryApi(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: (p = {}) =>
    tryApi(() => api.get("/billing/card-status", { params: p })),
  billingSetDefaultPaymentMethod: (p) =>
    tryApi(() => api.post("/billing/set-default-payment", p)),
  billingCalculateFee: (p) =>
    tryApi(() => api.post("/billing/calculate-fee", p)),
  billingChargeFee: (p) =>
    tryApi(() => api.post("/billing/charge-fee", p)),
  billingFeeHistory: () =>
    tryApi(() => api.get("/billing/fee-history")),

  /* Admin */
  adminCheck: () => tryApi(() => api.get("/admin/check")),
  adminUsers: () => tryApi(() => api.get("/admin/users")),
  adminUpdateUserTier: (p) =>
    tryApi(() => api.post("/admin/user/update-tier", p)),
  adminProcessPendingFees: (p = {}) =>
    tryApi(() => api.post("/admin/process-pending-fees", p)),
};

export default BotAPI;
