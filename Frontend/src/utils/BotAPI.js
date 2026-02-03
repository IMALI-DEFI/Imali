// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  // Node (backend / SSR)
  if (typeof process !== "undefined" && process.env && process.env[key] !== undefined) {
    return process.env[key] || fallback;
  }

  // Browser (CRA/Vite/Netlify injected)
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
    getEnv("REACT_APP_API_BASE") ||
    "";

  if (raw) {
    // If someone set ".../api" already, normalize to origin and let us append /api once
    const cleaned = stripTrailingSlash(raw);
    if (cleaned.endsWith("/api")) return cleaned.slice(0, -4);
    return cleaned;
  }

  // Default fallback
  if (IS_BROWSER) {
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
  if (!IS_BROWSER) return;

  if (!t) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  localStorage.setItem(TOKEN_KEY, t);
}

export function getAuthToken() {
  if (!IS_BROWSER) return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearAuthToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

/* ---------------- Axios Instance ---------------- */
const API_ORIGIN = resolveApiOrigin();
const BASE_URL = `${stripTrailingSlash(API_ORIGIN)}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/* ---------------- Dev Logging ---------------- */
(function logBaseUrl() {
  try {
    const isDevBrowser =
      IS_BROWSER &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.port === "3000" ||
        window.location.port === "5173");

    const isDevNode = !IS_BROWSER && process?.env?.NODE_ENV === "development";

    if (isDevBrowser || isDevNode) {
      // eslint-disable-next-line no-console
      console.log(`[BotAPI] baseURL: ${BASE_URL}`);
    }
  } catch {
    // ignore
  }
})();

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
      err?.response?.data?.detail ||
      err?.response?.data?.msg;

    const msg = apiMsg || err?.message || "Network or API error";

    // eslint-disable-next-line no-console
    console.error("[BotAPI] Error:", status, msg);

    const e = new Error(msg);
    e.status = status;
    e.data = err?.response?.data;
    throw e;
  }
}

/* ---------------- Raw Helpers (for any endpoint) ---------------- */
async function rawGet(path, config = {}) {
  // path can be "/me" or "/api/..." — normalize
  const p = String(path || "");
  const normalized = p.startsWith("/api/") ? p.replace("/api", "") : p; // api already has /api baseURL
  return tryApi(() => api.get(normalized, config));
}

async function rawPost(path, body = {}, config = {}) {
  const p = String(path || "");
  const normalized = p.startsWith("/api/") ? p.replace("/api", "") : p;
  return tryApi(() => api.post(normalized, body, config));
}

async function rawPut(path, body = {}, config = {}) {
  const p = String(path || "");
  const normalized = p.startsWith("/api/") ? p.replace("/api", "") : p;
  return tryApi(() => api.put(normalized, body, config));
}

async function rawDelete(path, config = {}) {
  const p = String(path || "");
  const normalized = p.startsWith("/api/") ? p.replace("/api", "") : p;
  return tryApi(() => api.delete(normalized, config));
}

/* ---------------- Central API Routes ---------------- */
export const BotAPI = {
  // expose underlying axios client (so dashboards can call BotAPI.client.get(...))
  client: api,

  // core error wrapper (sometimes useful)
  tryApi,

  // generic helpers
  rawGet,
  rawPost,
  rawPut,
  rawDelete,

  /* Health */
  health: () => tryApi(() => api.get("/health")),

  /* Signup */
  signup: (payload) => tryApi(() => api.post("/signup", payload)),

  /* Me endpoints */
  me: () => tryApi(() => api.get("/me")),
  activationStatus: () => tryApi(() => api.get("/me/activation-status")),

  /* Auth (optional) */
  login: async (payload) => {
    const data = await tryApi(() => api.post("/login", payload));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  activate: async (token) => {
    const data = await tryApi(() => api.post("/activate", { token }));
    const t = data?.token || data?.access_token || data?.auth_token || data?.jwt || "";
    if (t) setAuthToken(t);
    return data;
  },

  logout: async () => {
    // If you have a backend logout endpoint, call it; otherwise just clear token.
    try {
      await tryApi(() => api.post("/logout"));
    } catch {
      // ignore
    }
    clearAuthToken();
    return { success: true };
  },

  /* ---------------- OPTIONAL: Analytics (Dashboard) ----------------
     If your backend route exists, this works immediately.
     If not, it fails gracefully where used via safeCall().
  ------------------------------------------------------------------ */
  analyticsPnlSeries: (payload) => tryApi(() => api.post("/analytics/pnl/series", payload)),
};

export default BotAPI;
