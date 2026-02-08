// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   Env helpers
====================================================== */
function getEnv(key, fallback = "") {
  try {
    if (typeof process !== "undefined" && process.env?.[key] !== undefined) {
      return process.env[key] || fallback;
    }
    if (IS_BROWSER) {
      if (window.__ENV?.[key] !== undefined) return window.__ENV[key];
      if (window.process?.env?.[key]) return window.process.env[key];
    }
  } catch {}
  return fallback;
}

const strip = (s) => String(s || "").replace(/\/+$/, "");

/* ======================================================
   API base resolver
====================================================== */
function resolveApiOrigin() {
  const raw =
    getEnv("REACT_APP_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE") ||
    getEnv("VITE_API_BASE_URL") ||
    "";

  if (raw) {
    const clean = strip(raw);
    return clean.endsWith("/api") ? clean.slice(0, -4) : clean;
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

const API_ORIGIN = resolveApiOrigin();
const API_BASE = `${strip(API_ORIGIN)}/api`;

/* ======================================================
   Token helpers
====================================================== */
export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (!IS_BROWSER) return;
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export const isLoggedIn = () => !!getAuthToken();

/* ======================================================
   Axios instance
====================================================== */
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ❗ IMPORTANT:
 * Do NOT redirect on 401 here.
 * Pages decide what to do with auth failures.
 */
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

/* ======================================================
   Error wrapper
====================================================== */
async function request(fn) {
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
  api,

  /* auth */
  isLoggedIn,
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,

  signup: async (payload) => {
    const data = await request(() => api.post("/signup", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  login: async (payload) => {
    const data = await request(() => api.post("/auth/login", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  walletAuth: async (payload) => {
    const data = await request(() => api.post("/auth/wallet", payload));
    if (data?.token) setAuthToken(data.token);
    return data;
  },

  logout: () => clearAuthToken(),

  /* user */
  me: () => request(() => api.get("/me")),
  activationStatus: () => request(() => api.get("/me/activation-status")),

  /* billing */
  billingSetupIntent: (p = {}) =>
    request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () =>
    request(() => api.get("/billing/card-status")),

  /* trading */
  tradingEnable: (enabled) =>
    request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () => request(() => api.get("/trading/status")),

  /* bot */
  botStart: (p = {}) => request(() => api.post("/bot/start", p)),

  /* trades */
  sniperTrades: () => request(() => api.get("/sniper/trades")),
};

export default BotAPI;
export { BotAPI };
