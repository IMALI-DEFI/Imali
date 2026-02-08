// src/utils/BotAPI.js
import axios from "axios";

const TOKEN_KEY = "imali_token";
const IS_BROWSER = typeof window !== "undefined";

/* ---------------- Token helpers ---------------- */

export const getToken = () =>
  IS_BROWSER ? localStorage.getItem(TOKEN_KEY) : null;

export const setToken = (token) => {
  if (IS_BROWSER && token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearToken = () => {
  if (IS_BROWSER) {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const isLoggedIn = () => !!getToken();

/* ---------------- API base ---------------- */

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/* ---------------- Interceptors ---------------- */

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

    console.error(
      "[BotAPI]",
      err?.config?.method?.toUpperCase(),
      err?.config?.url,
      status
    );

    // ⚠️ only force logout if already logged in
    if (status === 401 && isLoggedIn()) {
      clearToken();
    }

    return Promise.reject(err);
  }
);

/* ---------------- Wrapper ---------------- */

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
    throw e;
  }
};

/* ---------------- Public API ---------------- */

const BotAPI = {
  // token helpers (THIS FIXES YOUR ERROR)
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  // auth
  signup: (p) => wrap(() => api.post("/signup", p)),
  login: async (p) => {
    const data = await wrap(() => api.post("/auth/login", p));
    if (data?.token) setToken(data.token);
    return data;
  },
  logout: () => clearToken(),

  // user
  me: () => wrap(() => api.get("/me")),
  activationStatus: () => wrap(() => api.get("/me/activation-status")),

  // billing
  billingSetupIntent: (p) =>
    wrap(() => api.post("/billing/setup-intent", p)),

  // trading
  tradingEnable: (enabled) =>
    wrap(() => api.post("/trading/enable", { enabled })),

  // bot
  botStart: (p = {}) => wrap(() => api.post("/bot/start", p)),

  // trades
  sniperTrades: () => wrap(() => api.get("/sniper/trades")),
};

export default BotAPI;
