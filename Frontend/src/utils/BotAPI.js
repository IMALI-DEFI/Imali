// src/utils/BotAPI.js
import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */
const TOKEN_KEY = "imali_token";
const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* =====================================================
   TOKEN HELPERS
===================================================== */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!token || typeof token !== "string") return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isLoggedIn = () => !!getToken();

/* =====================================================
   AXIOS INSTANCE
===================================================== */
const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =====================================================
   RESPONSE INTERCEPTOR (SAFE)
===================================================== */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const path = window.location.pathname;

    // 🚫 DO NOT auto-logout during signup / billing / activation
    const safeRoutes = [
      "/signup",
      "/login",
      "/billing",
      "/activation",
    ];

    const isSafe = safeRoutes.some((r) => path.startsWith(r));

    if (status === 401 && !isSafe) {
      clearToken();
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

/* =====================================================
   RESPONSE NORMALIZER
===================================================== */
const unwrap = async (fn) => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const e = new Error(
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      err?.message ||
      "Request failed"
    );
    e.status = err?.response?.status;
    throw e;
  }
};

/* =====================================================
   BOT API
===================================================== */
const BotAPI = {
  /* ---------- Auth ---------- */
  signup: (payload) =>
    unwrap(() => api.post("/signup", payload)),

  login: async (payload) => {
    const data = await unwrap(() =>
      api.post("/auth/login", payload)
    );
    if (data?.token) setToken(data.token);
    return data;
  },

  logout: () => {
    clearToken();
    window.location.href = "/login";
  },

  /* ---------- User ---------- */
  me: () => unwrap(() => api.get("/me")),
  activationStatus: () =>
    unwrap(() => api.get("/me/activation-status")),

  /* ---------- Billing ---------- */
  billingSetupIntent: (payload) =>
    unwrap(() => api.post("/billing/setup-intent", payload)),

  /* ---------- Trading ---------- */
  tradingEnable: (enabled) =>
    unwrap(() =>
      api.post("/trading/enable", { enabled: !!enabled })
    ),

  botStart: (payload = {}) =>
    unwrap(() => api.post("/bot/start", payload)),

  sniperTrades: () =>
    unwrap(() => api.get("/sniper/trades")),

  /* ---------- Helpers ---------- */
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
