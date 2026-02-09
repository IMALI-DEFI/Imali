// src/utils/BotAPI.js
import axios from "axios";

const TOKEN_KEY = "imali_token";
const IS_BROWSER = typeof window !== "undefined";

/* ---------------- Token helpers ---------------- */
export const getToken = () => (IS_BROWSER ? localStorage.getItem(TOKEN_KEY) : null);

export const setToken = (token) => {
  if (!IS_BROWSER) return;
  const clean = String(token || "").trim();
  if (!clean) return;
  localStorage.setItem(TOKEN_KEY, clean);
};

export const clearToken = () => {
  if (IS_BROWSER) localStorage.removeItem(TOKEN_KEY);
};

export const isLoggedIn = () => !!getToken();

/* ---------------- API base ---------------- */
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const api = axios.create({
  baseURL: `${String(API_BASE).replace(/\/$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/* ---------------- Token extractor ---------------- */
function extractToken(payload) {
  if (!payload) return "";
  return (
    payload.token ||
    payload.access_token ||
    payload.accessToken ||
    payload?.data?.token ||
    payload?.data?.access_token ||
    payload?.data?.accessToken ||
    ""
  );
}

/* ---------------- Interceptors ---------------- */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
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
        err?.response?.data?.detail ||
        err?.message ||
        "Request failed"
    );
    e.status = err?.response?.status;
    e.data = err?.response?.data;
    throw e;
  }
};

/* ---------------- Public API ---------------- */
const BotAPI = {
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  signup: async (p) => {
    const data = await wrap(() => api.post("/signup", p));
    const t = extractToken(data);
    if (t) setToken(t);
    return data;
  },

  login: async (p) => {
    const data = await wrap(() => api.post("/auth/login", p));
    const t = extractToken(data);
    if (t) setToken(t);
    return data;
  },

  logout: () => clearToken(),

  me: () => wrap(() => api.get("/me")),
  activationStatus: () => wrap(() => api.get("/me/activation-status")),
  billingSetupIntent: (p) => wrap(() => api.post("/billing/setup-intent", p)),
  tradingEnable: (enabled) => wrap(() => api.post("/trading/enable", { enabled: !!enabled })),
  botStart: (p = {}) => wrap(() => api.post("/bot/start", p)),
  sniperTrades: () => wrap(() => api.get("/sniper/trades")),
};

export default BotAPI;