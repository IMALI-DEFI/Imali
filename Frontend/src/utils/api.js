
// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  // CRA uses process.env, not import.meta.env
  if (typeof process !== "undefined" && process.env && key in process.env) {
    return process.env[key] || fallback;
  }
  return fallback;
}

function normalizeBase(url) {
  const u = String(url || "").trim().replace(/\/+$/, "");
  return u;
}

function resolveBaseUrl() {
  // Prefer explicit env - CRA uses REACT_APP_ prefix
  const envBase =
    getEnv("REACT_APP_API_BASE_URL") ||
    getEnv("REACT_APP_API_BASE");

  if (envBase) {
    const b = normalizeBase(envBase);
    // If they provided domain only, add /api
    if (!b.endsWith("/api")) return `${b}/api`;
    return b;
  }

  // Default: production-safe in browser
  if (IS_BROWSER) return "https://api.imali-defi.com/api";

  // Default: local dev server-side
  return "http://localhost:8001/api";
}

const BASE_URL = resolveBaseUrl();

/* ---------------- Email Header Helper ---------------- */
function getLocalEmail() {
  if (!IS_BROWSER) return "";
  const v =
    localStorage.getItem("imali_email") ||
    localStorage.getItem("email") ||
    "";
  return String(v || "").trim().toLowerCase();
}

/* ---------------- Axios Instance ---------------- */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

if (IS_BROWSER) {
  console.log(`[BotAPI] baseURL: ${BASE_URL}`);
}

/* ---------------- Token + Email Injection ---------------- */
let authToken = null;

export function setAuthToken(token) {
  authToken = token || null;
}

api.interceptors.request.use((config) => {
  // Bearer auth (optional)
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;

  // Email header (needed for your /api/me style backend)
  const email = getLocalEmail();
  if (email) config.headers["X-Imali-Email"] = email;

  return config;
});

/* ---------------- Error Wrapper ---------------- */
function extractErr(err) {
  const data = err?.response?.data;
  return (
    data?.detail ||
    data?.message ||
    data?.error ||
    err?.message ||
    "Network or API error"
  );
}

async function tryApi(fn) {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const msg = extractErr(err);
    console.error("[BotAPI] Error:", msg, err?.response?.status);
    throw new Error(msg);
  }
}

/* ---------------- Central API Routes ----------------
   NOTE:
   Your backend must match these. If your backend uses different paths,
   either change these, or create aliases on the server.
------------------------------------------------------ */
export const BotAPI = {
  // General status
  health: () => tryApi(() => api.get("/health")),
  status: () => tryApi(() => api.get("/status")),
  me: () => tryApi(() => api.get("/me")),

  // Trading bot controls
  start: (payload = {}) => tryApi(() => api.post("/bot/start", payload)),
  stop: () => tryApi(() => api.post("/bot/stop")),

  // Metrics & performance
  metrics: () => tryApi(() => api.get("/metrics/pnl")),
  equity: () => tryApi(() => api.get("/metrics/equity")),
  trades: (params = { limit: 50 }) => tryApi(() => api.get("/trades/recent", { params })),
  positions: () => tryApi(() => api.get("/positions/open")),

  // User settings
  settings: (payload) => tryApi(() => api.post("/settings", payload)),

  // Activation flows (these should align to Activation.jsx)
  setExecutionMode: (execution_mode) =>
    tryApi(() => api.post("/me/execution-mode", { execution_mode })),

  saveWallet: (address, chainId = null) =>
    tryApi(() => api.post("/me/wallet", { address, chainId })),

  stopTrading: () => tryApi(() => api.post("/me/trading/stop", {})),

  // Auth (if you use these routes)
  activate: (token) => tryApi(() => api.post("/users/activate", { token })),
  signup: (payload) => tryApi(() => api.post("/users/signup", payload)),
  login: (payload) => tryApi(() => api.post("/users/login", payload)),
};

export default BotAPI;
