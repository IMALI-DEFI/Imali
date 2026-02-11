// src/utils/BotAPI.js
import axios from "axios";

/* ================= CONFIG ================= */
const TOKEN_KEY = "imali_token";
const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* ================= TOKEN HELPERS ================= */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  if (!token || typeof token !== "string") return;
  localStorage.setItem(TOKEN_KEY, token); // ✅ RAW JWT ONLY
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isLoggedIn = () => !!getToken();

/* ================= AXIOS ================= */
const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/* ================= REQUEST AUTH ================= */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ✅ NO PREFIX
  }
  return config;
});

/* ================= RESPONSE SAFETY ================= */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const path = window.location.pathname;

    // 🚫 Do NOT auto-logout during onboarding
    const safeRoutes = ["/signup", "/login", "/billing", "/activation"];
    const isSafe = safeRoutes.some((r) => path.startsWith(r));

    if (status === 401 && !isSafe) {
      clearToken();
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

/* ================= HELPER ================= */
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

/* ================= API ================= */
const BotAPI = {
  signup: (payload) => unwrap(() => api.post("/signup", payload)),

  login: async (payload) => {
    const data = await unwrap(() => api.post("/auth/login", payload));
    if (data?.token) setToken(data.token);
    return data;
  },

  logout: () => {
    clearToken();
    window.location.href = "/login";
  },

  me: () => unwrap(() => api.get("/me")),

  activationStatus: () =>
    unwrap(() => api.get("/me/activation-status")),

  billingSetupIntent: (payload) =>
    unwrap(() => api.post("/billing/setup-intent", payload)),

  botStart: (payload = {}) =>
    unwrap(() => api.post("/bot/start", payload)),

  sniperTrades: () =>
    unwrap(() => api.get("/sniper/trades")),

  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
