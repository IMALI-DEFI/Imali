// src/utils/BotAPI.js
import axios from "axios";

/* ======================================================
   Constants
====================================================== */
const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* ======================================================
   API Base
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
      return "http://localhost:8080";
    }
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8080";
}

const API_BASE = resolveApiBase();
const API_ROOT = `${API_BASE}/api`;

/* ======================================================
   Token helpers (⚠️ KEEP THESE NAMES)
====================================================== */
function getToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token) {
  if (!IS_BROWSER) return;
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

/* ======================================================
   Axios instance
====================================================== */
const api = axios.create({
  baseURL: API_ROOT,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

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

    if (
      status === 401 &&
      IS_BROWSER &&
      !window.location.pathname.startsWith("/login")
    ) {
      clearToken();
    }

    return Promise.reject(err);
  }
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
   Public API (⚠️ STABLE SHAPE)
====================================================== */
const BotAPI = {
  api,

  // auth helpers (EXPECTED BY APP)
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  logout: () => {
    clearToken();
    return Promise.resolve();
  },

  /* Health */
  health: () => request(() => api.get("/health")),

  /* Auth */
  signup: async (p) => {
    const data = await request(() => api.post("/signup", p));
    if (data?.token) setToken(data.token);
    return data;
  },

  login: async (p) => {
    const data = await request(() => api.post("/auth/login", p));
    if (data?.token) setToken(data.token);
    return data;
  },

  walletAuth: async (p) => {
    const data = await request(() => api.post("/auth/wallet", p));
    if (data?.token) setToken(data.token);
    return data;
  },

  /* User */
  me: () => request(() => api.get("/me")),
  activationStatus: () =>
    request(() => api.get("/me/activation-status")),

  /* Billing */
  billingSetupIntent: (p = {}) =>
    request(() => api.post("/billing/setup-intent", p)),
  billingCardStatus: () =>
    request(() => api.get("/billing/card-status")),

  /* Trading */
  tradingEnable: (enabled) =>
    request(() => api.post("/trading/enable", { enabled: !!enabled })),
  tradingStatus: () =>
    request(() => api.get("/trading/status")),

  /* Bot */
  botStart: (p = {}) =>
    request(() => api.post("/bot/start", p)),

  /* Trades */
  sniperTrades: () =>
    request(() => api.get("/sniper/trades")),
};

export default BotAPI;
export { BotAPI };
