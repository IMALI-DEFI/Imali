import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/* =========================
   TOKEN HELPERS
========================= */

const safeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {}
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
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token && typeof token === "string") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* =========================
   RESPONSE INTERCEPTOR
========================= */

let redirecting = false;

const AUTH_WHITELIST = [
  "/login",
  "/signup",
  "/billing",
  "/activation",
  "/terms",
  "/privacy",
  "/trade-demo",
];

const getPath = () => {
  try {
    return window.location.pathname || "/";
  } catch {
    return "/";
  }
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const path = getPath();

    // 429 — pass through for retry logic, never redirect
    if (status === 429) {
      console.warn(`[API] Rate limited on ${url}`);
      return Promise.reject(error);
    }

    // 5xx — server errors, never redirect or clear token
    if (status >= 500) {
      console.warn(`[API] Server error ${status} on ${url}`);
      return Promise.reject(error);
    }

    // Network errors — never redirect or clear token
    if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") {
      console.warn(`[API] Network error on ${url}`);
      return Promise.reject(error);
    }

    // 401 — actual auth failure
    const isAuthEndpoint =
      url.includes("/api/auth/login") ||
      url.includes("/api/signup");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();

      const isWhitelisted = AUTH_WHITELIST.some((p) =>
        path.startsWith(p)
      );

      if (!isWhitelisted && !redirecting) {
        redirecting = true;
        const next = encodeURIComponent(path);
        window.location.href = `/login?next=${next}`;
        setTimeout(() => {
          redirecting = false;
        }, 4000);
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   SAFE UNWRAP
========================= */

const unwrap = (res) => {
  if (!res) return null;
  return res.data ?? null;
};

const getErrMessage = (err, fallback = "Request failed") => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

/* =========================
   API METHODS
========================= */

const BotAPI = {
  /* TOKEN */
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => !!getStoredToken(),

  /* AUTH */
  async signup(payload) {
    const res = await api.post("/api/signup", payload);
    return unwrap(res);
  },

  async login(payload) {
    clearStoredToken();
    const res = await api.post("/api/auth/login", payload);
    const data = unwrap(res);
    if (!data?.token) {
      throw new Error("Login failed: no token returned");
    }
    setStoredToken(data.token);
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

  /* BILLING */
  async createSetupIntent(payload) {
    const res = await api.post("/api/billing/setup-intent", payload);
    return unwrap(res);
  },

  async getCardStatus() {
    const res = await api.get("/api/billing/card-status");
    return unwrap(res);
  },

  /* INTEGRATIONS */
  async connectOKX(payload) {
    const res = await api.post("/api/integrations/okx", payload);
    return unwrap(res);
  },

  async connectAlpaca(payload) {
    const res = await api.post("/api/integrations/alpaca", payload);
    return unwrap(res);
  },

  async connectWallet(payload) {
    const res = await api.post("/api/integrations/wallet", payload);
    return unwrap(res);
  },

  /* TRADING */
  async toggleTrading(enabled) {
    const res = await api.post("/api/trading/enable", { enabled });
    return unwrap(res);
  },

  /* BOT */
  async startBot(payload = { mode: "paper" }) {
    const res = await api.post("/api/bot/start", payload);
    return unwrap(res);
  },

  async getTrades() {
    const res = await api.get("/api/sniper/trades");
    return unwrap(res);
  },

  /* UTIL */
  errMessage(err, fallback) {
    return getErrMessage(err, fallback);
  },
};

export { api };
export default BotAPI;
