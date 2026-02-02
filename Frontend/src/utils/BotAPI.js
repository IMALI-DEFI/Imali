// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key] || fallback;
  }
  if (IS_BROWSER) {
    if (window.__ENV && window.__ENV[key] !== undefined) return window.__ENV[key];
    if (window[key] !== undefined) return window[key];
    if (window.process?.env?.[key]) return window.process.env[key];
  }
  return fallback;
}

function stripTrailingSlash(s) {
  return String(s || "").replace(/\/+$/, "");
}

function resolveApiOrigin() {
  // Prefer explicit env
  const raw =
    getEnv("API_BASE_URL") ||
    getEnv("VITE_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE_URL") ||
    "";

  if (raw) {
    // If someone set ".../api" already, normalize to origin and let us append /api once
    const cleaned = stripTrailingSlash(raw);
    if (cleaned.endsWith("/api")) return cleaned.slice(0, -4);
    return cleaned;
  }

  // Default fallback
  if (IS_BROWSER) {
    // local dev heuristic
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8001";
    return "https://api.imali-defi.com";
  }

  return "http://localhost:8001";
}

/* ---------------- Token Storage ---------------- */
const TOKEN_KEY = "imali_token";

export function setAuthToken(token) {
  const t = (token || "").trim();
  if (!t) {
    if (IS_BROWSER) localStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (IS_BROWSER) localStorage.setItem(TOKEN_KEY, t);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

/* ---------------- Axios Instance ---------------- */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

/* ---------------- Dev Logging ---------------- */
if (IS_BROWSER) {
  const isDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.port === "3000" ||
    window.location.port === "5173";
  if (isDev) console.log(`[BotAPI] baseURL: ${BASE_URL}`);
} else {
  const isDev = process.env.NODE_ENV === "development";
  console.log(`[BotAPI] baseURL: ${BASE_URL} (${isDev ? "dev" : "prod"})`);
}

/* ---------------- Token Injection ---------------- */
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------------- Error Wrapper ---------------- */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const apiMsg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.detail;
    const msg = apiMsg || err?.message || "Network or API error";
    console.error("[BotAPI] Error:", status, msg);
    const e = new Error(msg);
    e.status = status;
    throw e;
  }
}

/* ---------------- Central API Routes ---------------- */
export const BotAPI = {
  /* Health */
  health: () => tryApi(() => api.get("/health")),

  /* Signup (your backend currently supports POST /api/signup) */
  signup: (payload) => tryApi(() => api.post("/signup", payload)),

  /* Me endpoints */
  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),

  /* Optional: if you later add a login endpoint that returns a token */
  login: async (payload) => {
    // EXPECTS backend: POST /api/login -> { token: "..." } (or access_token)
    const data = await tryApi(() => api.post("/login", payload));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  /* Optional: if you add activation that returns token */
  activate: async (token) => {
    // EXPECTS backend: POST /api/activate -> { token: "..." } (or access_token)
    const data = await tryApi(() => api.post("/activate", { token }));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  /* --- Keep these placeholders if your backend adds them later --- */
  // start: (payload = {}) => tryApi(() => api.post("/bot/start", payload)),
  // stop: () => tryApi(() => api.post("/bot/stop")),
  // metrics: () => tryApi(() => api.get("/metrics/pnl")),
  // equity: () => tryApi(() => api.get("/metrics/equity")),
  // trades: (params = { limit: 50 }) => tryApi(() => api.get("/trades/recent", { params })),
  // positions: () => tryApi(() => api.get("/positions/open")),
  // settings: (payload) => tryApi(() => api.post("/settings", payload)),
};

export default BotAPI;
