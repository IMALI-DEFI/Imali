import axios from "axios";

/* =====================================================
   CONFIG
===================================================== */
const TOKEN_KEY = "imali_token";
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.imali-defi.com";

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
    e.data = err?.response?.data;
    throw e;
  }
};

/* =====================================================
   BOT API (AUTH + DASHBOARD SAFE)
===================================================== */
const BotAPI = {
  /* ---------- Auth ---------- */
  login: async (payload) => {
    const data = await unwrap(() =>
      api.post("/auth/login", payload)
    );

    const token =
      data?.token ||
      data?.access_token ||
      data?.jwt;

    if (token) setToken(token);
    return data;
  },

  logout: () => {
    clearToken();
  },

  /* ---------- User ---------- */
  me: () =>
    unwrap(() => api.get("/me")),

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

  /* ---------- Token helpers ---------- */
  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
