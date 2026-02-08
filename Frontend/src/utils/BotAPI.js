// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   Token Helpers (PUBLIC + STABLE)
====================================================== */
function setToken(token) {
  if (!IS_BROWSER) return;
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, String(token));
}

function getToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

function clearToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

/* ======================================================
   API Base Resolution
====================================================== */
function apiBase() {
  const env =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "";

  if (env) return env.replace(/\/+$/, "");

  if (IS_BROWSER) {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      return "http://localhost:8080";
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8080";
}

const BASE_URL = `${apiBase()}/api`;

/* ======================================================
   Axios Instance
====================================================== */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* ======================================================
   Request Interceptor
====================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ======================================================
   Response Interceptor (SAFE)
====================================================== */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const path = err?.config?.url || "";

    // Only force logout on AUTH endpoints
    if (
      status === 401 &&
      IS_BROWSER &&
      !path.includes("/auth") &&
      !path.includes("/signup")
    ) {
      console.warn("[BotAPI] Unauthorized, clearing token");
      clearToken();
    }

    return Promise.reject(err);
  }
);

/* ======================================================
   Error Wrapper
====================================================== */
async function wrap(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    const e = new Error(
      data?.message ||
      data?.error ||
      "Request failed"
    );
    e.status = status;
    e.data = data;
    throw e;
  }
}

/* ======================================================
   PUBLIC API (DO NOT RENAME)
====================================================== */
const BotAPI = {
  // token access (FIXES YOUR ERROR)
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  /* Auth */
  signup: (p) => wrap(() => api.post("/signup", p)),
  login: async (p) => {
    const data = await wrap(() => api.post("/auth/login", p));
    if (data?.token) setToken(data.token);
    return data;
  },
  logout: () => clearToken(),

  /* User */
  me: () => wrap(() => api.get("/me")),
  activationStatus: () => wrap(() => api.get("/me/activation-status")),

  /* Trading */
  tradingEnable: (enabled) =>
    wrap(() => api.post("/trading/enable", { enabled })),
  botStart: (p = {}) =>
    wrap(() => api.post("/bot/start", p)),

  /* Trades */
  sniperTrades: () => wrap(() => api.get("/sniper/trades")),

  /* Billing */
  billingSetupIntent: () =>
    wrap(() => api.post("/billing/setup-intent")),
};

export default BotAPI;
