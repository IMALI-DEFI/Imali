// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/* =========================
   TOKEN HELPERS
========================= */

const safeGet = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const safeSet = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ignore
  }
};

const safeRemove = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {
    // ignore
  }
};

const getStoredToken = () => safeGet(TOKEN_KEY);

const setStoredToken = (token) => {
  if (!token || typeof token !== "string") return;
  safeSet(TOKEN_KEY, token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const clearStoredToken = () => {
  safeRemove(TOKEN_KEY);
  delete api.defaults.headers.common["Authorization"];
};

/* =========================
   ROUTE HELPERS (avoid redirect loops)
========================= */

const getPath = () => {
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
};

// Pages where a 401 can happen during onboarding and we should NOT force a redirect loop.
// (Ex: right after login/signup while page is transitioning)
const AUTH_WHITELIST = [
  "/login",
  "/signup",
  "/billing",
  "/activation",
  "/trade-demo",
  "/terms",
  "/privacy",
];

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    // Ensure headers object exists
    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // If no token, ensure we don't accidentally send an old default
      if (config.headers.Authorization) delete config.headers.Authorization;
    }

    return config;
  },
  (err) => Promise.reject(err)
);

/* =========================
   RESPONSE INTERCEPTOR
   - clears token on 401
   - avoids redirect loops during onboarding
========================= */

let redirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const path = getPath();

    // Auth endpoints should not trigger global logout loops
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/signup");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();

      // If user is already on an allowed onboarding/public page, do not hard-redirect.
      // Let the page handle it (or the user click login).
      const isWhitelisted = AUTH_WHITELIST.some((p) => path.startsWith(p));
      if (!isWhitelisted && !redirecting) {
        redirecting = true;
        const next = encodeURIComponent(path);
        window.location.href = `/login?next=${next}`;
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   API METHODS
========================= */

const unwrap = (res) => res?.data;

/** Normalize axios error messages */
const getErrMessage = (err, fallback = "Request failed") => {
  const msg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  return msg || fallback;
};

const BotAPI = {
  /* ========= TOKEN ========= */

  setToken(token) {
    setStoredToken(token);
  },

  getToken() {
    return getStoredToken();
  },

  clearToken() {
    clearStoredToken();
  },

  isLoggedIn() {
    return !!getStoredToken();
  },

  /* ========= AUTH ========= */

  async signup(payload) {
    // payload: { email, password, tier, strategy, ... }
    const res = await api.post("/api/signup", payload);
    return unwrap(res);
  },

  async login(payload) {
    // payload: { email, password }
    clearStoredToken();

    const res = await api.post("/api/auth/login", payload);
    const data = unwrap(res);

    if (!data?.token) {
      throw new Error("Login failed: no token returned");
    }

    setStoredToken(data.token);

    // Optional: warm auth to prevent immediate 401 loops on next page
    try {
      await api.get("/api/me");
    } catch {
      // ignore; next screen may handle it
    }

    return data;
  },

  async me() {
    const res = await api.get("/api/me");
    return unwrap(res);
  },

  async activationStatus() {
    const res = await api.get("/api/me/activation-status");
    return unwrap(res);
  },

  /* ========= BILLING ========= */

  async createSetupIntent(payload) {
    const res = await api.post("/api/billing/setup-intent", payload);
    return unwrap(res);
  },

  /* ========= INTEGRATIONS ========= */

  async connectOKX(payload) {
    // payload: { api_key, api_secret, passphrase, mode }
    const res = await api.post("/api/integrations/okx", payload);
    return unwrap(res);
  },

  async connectAlpaca(payload) {
    // payload: { api_key, api_secret, mode }
    const res = await api.post("/api/integrations/alpaca", payload);
    return unwrap(res);
  },

  async connectWallet(payload) {
    // payload: { address } or { wallet }
    const res = await api.post("/api/integrations/wallet", payload);
    return unwrap(res);
  },

  /* ========= TRADING ========= */

  async toggleTrading(enabled) {
    const res = await api.post("/api/trading/enable", { enabled });
    return unwrap(res);
  },

  /* ========= BOT CONTROL ========= */

  async startBot(payload = { mode: "paper" }) {
    const res = await api.post("/api/bot/start", payload);
    return unwrap(res);
  },

  /* ========= UTIL ========= */

  // Useful when you want a consistent error message in UI
  errMessage(err, fallback) {
    return getErrMessage(err, fallback);
  },
};

export { api };
export default BotAPI;
