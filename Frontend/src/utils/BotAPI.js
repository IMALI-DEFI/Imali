// src/utils/BotAPI.js
import axios from "axios";

const TOKEN_KEY = "imali_token";
const IS_BROWSER = typeof window !== "undefined";

/* ---------------- Token helpers ---------------- */
export const getToken = () => (IS_BROWSER ? localStorage.getItem(TOKEN_KEY) : null);

export const setToken = (token) => {
  if (!IS_BROWSER) return;
  const clean = String(token || "").trim();
  if (!clean) {
    console.warn("[BotAPI] setToken called with empty/invalid value");
    return;
  }
  localStorage.setItem(TOKEN_KEY, clean);
  console.log("[BotAPI] setToken OK → length:", clean.length);
  // Verify write succeeded
  const after = localStorage.getItem(TOKEN_KEY);
  if (after !== clean) {
    console.error("[BotAPI] localStorage write failed! Expected:", clean.slice(0, 20) + "... Got:", after);
  }
};

export const clearToken = () => {
  if (IS_BROWSER) {
    localStorage.removeItem(TOKEN_KEY);
    console.log("[BotAPI] clearToken called");
  }
};

export const isLoggedIn = () => {
  const has = !!getToken();
  console.debug("[BotAPI] isLoggedIn check →", has);
  return has;
};

/* ---------------- Token extractor ---------------- */
function extractToken(payload) {
  if (!payload || typeof payload !== "object") {
    console.warn("[extractToken] payload not object:", payload);
    return "";
  }

  const candidates = [
    payload.token,
    payload.access_token,
    payload.accessToken,
    payload.jwt,
    payload.auth_token,
    payload.id_token,
    payload?.data?.token,
    payload?.data?.access_token,
    payload?.data?.accessToken,
    payload?.result?.token,
    payload?.session?.token,
    payload?.auth?.token
  ];

  for (const val of candidates) {
    if (typeof val === "string" && val.includes(".") && val.split(".").length >= 3) {
      console.log("[extractToken] Found token (first 20 chars):", val.slice(0, 20) + "...");
      return val;
    }
  }

  // Last resort: look for any long string with dots
  for (const val of Object.values(payload)) {
    if (typeof val === "string" && val.length > 100 && val.includes(".") && val.split(".").length >= 3) {
      console.log("[extractToken] Found suspicious JWT-like string:", val.slice(0, 20) + "...");
      return val;
    }
  }

  console.warn("[extractToken] No token found in payload keys:", Object.keys(payload));
  return "";
}

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

/* ---------------- Interceptors ---------------- */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.debug(`[BotAPI] → Attached token to ${config.method.toUpperCase()} ${config.url}`);
  } else {
    console.debug(`[BotAPI] → No token for ${config.method.toUpperCase()} ${config.url}`);
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    console.error("[BotAPI] Request failed", {
      method: err?.config?.method?.toUpperCase(),
      url: err?.config?.url,
      status,
      responsePreview: err?.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : "no body"
    });

    if (status === 401 && isLoggedIn()) {
      console.warn("[BotAPI] 401 → clearing token");
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
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.detail ||
      err?.message ||
      "Request failed";
    const e = new Error(msg);
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
    console.log("[SIGNUP] Sending:", { email: p?.email, tier: p?.tier, strategy: p?.strategy });

    const raw = await api.post("/signup", p);
    console.log("[SIGNUP] Status:", raw.status);
    console.log("[SIGNUP] Data preview:", JSON.stringify(raw.data || {}).slice(0, 300));

    const data = raw.data;
    const t = extractToken(data);
    if (t) setToken(t);
    return data;
  },

  login: async (p) => {
    console.log("[LOGIN] Sending:", { email: p?.email });

    let raw;
    try {
      raw = await api.post("/auth/login", p);
    } catch (err) {
      console.error("[LOGIN] Request error:", err.response?.status, err.response?.data);
      throw err;
    }

    console.log("[LOGIN] Status:", raw.status);
    console.log("[LOGIN] Content-Type:", raw.headers["content-type"]);
    console.log("[LOGIN] Data type:", typeof raw.data);
    console.log("[LOGIN] Data preview:", JSON.stringify(raw.data || {}).slice(0, 400));

    const data = raw.data;
    const t = extractToken(data);
    if (t) {
      setToken(t);
    } else {
      console.warn("[LOGIN] No token extracted");
    }

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