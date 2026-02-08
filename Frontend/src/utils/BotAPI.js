// src/utils/BotAPI.js
import axios from "axios";

const TOKEN_KEY = "imali_token";
const IS_BROWSER = typeof window !== "undefined";

// ────────────────────────────────────────────────
// Token Helpers
// ────────────────────────────────────────────────
export const getToken = () => {
  if (!IS_BROWSER) return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (!IS_BROWSER || !token) return;
  localStorage.setItem(TOKEN_KEY, token);
  console.debug("[BotAPI] Token stored (length:", token.length, ")");
};

export const clearToken = () => {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
  console.debug("[BotAPI] Token cleared");
};

export const isLoggedIn = () => {
  const hasToken = !!getToken();
  if (!hasToken) {
    console.debug("[BotAPI] isLoggedIn → false (no token)");
  }
  return hasToken;
};

// ────────────────────────────────────────────────
// Axios Instance Setup
// ────────────────────────────────────────────────
const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  process.env.REACT_APP_API_BASE ||
  "https://api.imali-defi.com";

const api = axios.create({
  baseURL: `${API_BASE.replace(/\/$/, "")}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ────────────────────────────────────────────────
// Request Interceptor – Attach token + debug
// ────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.debug(`[BotAPI] → Attached Bearer token to ${config.method.toUpperCase()} ${config.url}`);
    } else {
      console.debug(`[BotAPI] → No token for ${config.method.toUpperCase()} ${config.url} (public or unauthenticated call?)`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ────────────────────────────────────────────────
// Response Interceptor – Handle 401 cleanly
// ────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const method = error?.config?.method?.toUpperCase();
    const url = error?.config?.url;

    console.error("[BotAPI] Request failed", { method, url, status });

    if (status === 401 && isLoggedIn()) {
      console.warn("[BotAPI] 401 → clearing potentially invalid/expired token");
      clearToken();
    }

    return Promise.reject(error);
  }
);

// ────────────────────────────────────────────────
// Response Wrapper – Consistent error shape
// ────────────────────────────────────────────────
const wrap = async (requestFn) => {
  try {
    const res = await requestFn();
    return res.data;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err.message ||
      "Request failed";

    const wrappedError = new Error(message);
    wrappedError.status = err?.response?.status;
    wrappedError.data = err?.response?.data;

    console.error("[BotAPI] Wrapped error:", wrappedError.message, wrappedError.status);
    throw wrappedError;
  }
};

// ────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────
const BotAPI = {
  // Token utilities (keep exported)
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  // Auth
  signup: (payload) => wrap(() => api.post("/signup", payload)),

  login: async (credentials) => {
    console.debug("[BotAPI] login called with email:", credentials?.email || "—");

    const data = await wrap(() => api.post("/auth/login", credentials));

    console.debug("[BotAPI] login response shape:", Object.keys(data));

    if (data?.token) {
      setToken(data.token);
      console.log("[BotAPI] login → token stored successfully");
    } else {
      console.warn(
        "[BotAPI] login → 200 OK but no 'token' field in response:",
        data
      );
    }

    return data;
  },

  logout: () => {
    clearToken();
    console.log("[BotAPI] logout → token cleared");
  },

  // User
  me: () => wrap(() => api.get("/me")),
  activationStatus: () => wrap(() => api.get("/me/activation-status")),

  // Billing
  billingSetupIntent: (payload) => wrap(() => api.post("/billing/setup-intent", payload)),

  // Trading & Bot
  tradingEnable: (enabled) => wrap(() => api.post("/trading/enable", { enabled })),
  botStart: (payload = {}) => wrap(() => api.post("/bot/start", payload)),

  // Trades
  sniperTrades: () => wrap(() => api.get("/sniper/trades")),
};

export default BotAPI;
