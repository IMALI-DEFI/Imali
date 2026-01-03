// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(viteKey, craKey, fallback = "") {
  // Vite
  try {
    if (typeof import.meta !== "undefined" && import.meta.env && viteKey) {
      const v = import.meta.env[viteKey];
      if (v) return v;
    }
  } catch {
    // ignore
  }
  // CRA / Node
  if (typeof process !== "undefined" && process.env && craKey) {
    const v = process.env[craKey];
    if (v) return v;
  }
  return fallback;
}

/**
 * Ensure base ends with /api (bulletproof).
 * - https://api.imali-defi.com      -> https://api.imali-defi.com/api
 * - https://api.imali-defi.com/api  -> https://api.imali-defi.com/api
 */
function ensureApiSuffix(base) {
  const b = String(base || "").replace(/\/+$/, "");
  if (!b) return b;
  return /\/api$/i.test(b) ? b : `${b}/api`;
}

/**
 * Upgrade http->https when running on an https page (mixed-content fix).
 */
function upgradeIfNeeded(url) {
  if (
    IS_BROWSER &&
    window.location?.protocol === "https:" &&
    /^http:\/\//i.test(url)
  ) {
    return url.replace(/^http:\/\//i, "https://");
  }
  return url;
}

const RAW_BASE =
  getEnv("VITE_API_BASE_URL", "REACT_APP_API_BASE_URL") ||
  (IS_BROWSER ? "https://api.imali-defi.com" : "http://localhost:3001");

const BASE_URL = ensureApiSuffix(upgradeIfNeeded(RAW_BASE));

/* ---------------- Axios Instance ---------------- */
const api = axios.create({
  baseURL: BASE_URL, // guaranteed .../api
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

if (IS_BROWSER) {
  // helpful in browser devtools
  // eslint-disable-next-line no-console
  console.log(`[BotAPI] baseURL: ${BASE_URL}`);
}

/* ---------------- Token Injection ---------------- */
let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

/* ---------------- Error Wrapper ---------------- */
async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Network or API error";
    // eslint-disable-next-line no-console
    console.error("[BotAPI] Error:", msg);
    throw new Error(msg);
  }
}

/* ---------------- Mode helpers ---------------- */
/**
 * TradeDemo.jsx stores run mode here.
 * If missing, default to "demo".
 */
function getRunMode() {
  if (!IS_BROWSER) return "demo";
  const saved = (localStorage.getItem("IMALI_RUNMODE") || "").toLowerCase();
  return saved === "live" ? "live" : "demo";
}

function modePrefix(mode) {
  return mode === "live" ? "/live" : "/demo";
}

/* ---------------- Central API Routes ---------------- */
export const BotAPI = {
  /* -------- General -------- */

  // NEW: server health (replaces /status)
  health: () => tryApi(() => api.get("/health")),
  healthz: () => tryApi(() => api.get("/healthz")),

  /**
   * Back-compat alias: status()
   * Uses /health first, falls back to /healthz.
   */
  status: async () => {
    try {
      return await BotAPI.health();
    } catch {
      return await BotAPI.healthz();
    }
  },

  /* -------- Trade Demo / Live (crypto) -------- */

  /**
   * Back-compat alias: start()
   * Previously /bot/start
   * Now: /demo/start or /live/start
   */
  start: (payload = {}, mode = getRunMode()) =>
    tryApi(() => api.post(`${modePrefix(mode)}/start`, payload)),

  /**
   * Optional: configure the running session
   * /demo/config or /live/config
   */
  config: (payload = {}, mode = getRunMode()) =>
    tryApi(() => api.post(`${modePrefix(mode)}/config`, payload)),

  /**
   * Tick once
   * /demo/tick or /live/tick
   */
  tick: (payload = {}, mode = getRunMode()) =>
    tryApi(() => api.post(`${modePrefix(mode)}/tick`, payload)),

  /**
   * Stop — only works if your backend has a stop route.
   * If you don’t, you can remove this or map it to whatever you use.
   */
  stop: (payload = {}, mode = getRunMode()) =>
    tryApi(() => api.post(`${modePrefix(mode)}/stop`, payload)),

  /* -------- Metrics (only if your backend supports these) -------- */
  metrics: () => tryApi(() => api.get("/metrics/pnl")),
  equity: () => tryApi(() => api.get("/metrics/equity")),
  trades: (params = { limit: 50 }) =>
    tryApi(() => api.get("/trades/recent", { params })),
  positions: () => tryApi(() => api.get("/positions/open")),

  /* -------- User settings / auth (only if your backend supports these) -------- */
  settings: (payload) => tryApi(() => api.post("/settings", payload)),
  activate: (token) => tryApi(() => api.post("/users/activate", { token })),
  signup: (payload) => tryApi(() => api.post("/users/signup", payload)),
  login: (payload) => tryApi(() => api.post("/users/login", payload)),
};

export default BotAPI;