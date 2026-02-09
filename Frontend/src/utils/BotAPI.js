// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const TOKEN_KEY = "imali_token";
const IS_BROWSER = typeof window !== "undefined";

/* ======================================================
   Token helpers (single source of truth)
====================================================== */
export const getToken = () =>
  IS_BROWSER ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token) => {
  if (!IS_BROWSER) return;
  if (!token || typeof token !== "string") return;

  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  if (IS_BROWSER) {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const isLoggedIn = () => !!getToken();

/* ======================================================
   API base
====================================================== */
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* ======================================================
   Interceptors
====================================================== */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // IMPORTANT:
    // Do NOT clear token on login/signup failures
    if (status === 401 && isLoggedIn()) {
      clearToken();
    }

    return Promise.reject(err);
  }
);

/* ======================================================
   Wrapper
====================================================== */
const wrap = async (fn) => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const e = new Error(
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Request failed"
    );
    e.status = err?.response?.status;
    e.data = err?.response?.data;
    throw e;
  }
};

/* ======================================================
   Public API (matches backend)
====================================================== */
const BotAPI = {
  // token helpers
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  /* ---------------- Auth ---------------- */
  signup: async (payload) => {
    const data = await wrap(() => api.post("/signup", payload));

    // backend returns: { success, token, user }
    if (data?.token) {
      setToken(data.token);
    }

    return data;
  },

  login: async (payload) => {
    const data = await wrap(() => api.post("/auth/login", payload));

    // backend returns: { success, token, user }
    if (data?.token) {
      setToken(data.token);
    }

    return data;
  },

  logout: () => {
    clearToken();
  },

  /* ---------------- User ---------------- */
  me: () => wrap(() => api.get("/me")),
  activationStatus: () => wrap(() => api.get("/me/activation-status")),

  /* ---------------- Billing ---------------- */
  billingSetupIntent: (p = {}) =>
    wrap(() => api.post("/billing/setup-intent", p)),

  /* ---------------- Trading ---------------- */
  tradingEnable: (enabled) =>
    wrap(() => api.post("/trading/enable", { enabled: !!enabled })),

  /* ---------------- Bot ---------------- */
  botStart: (p = {}) => wrap(() => api.post("/bot/start", p)),

  /* ---------------- Trades ---------------- */
  sniperTrades: () => wrap(() => api.get("/sniper/trades")),
};

export default BotAPI;
