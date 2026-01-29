// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

// Unified environment variable access
function getEnvVar(key, fallback = "") {
  // Node.js environment (backend)
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || fallback;
  }
  
  // Browser environment - check various possible sources
  if (IS_BROWSER) {
    // Check if values are injected via global variable (common in SSR/SSG setups)
    if (window.__ENV && window.__ENV[key] !== undefined) {
      return window.__ENV[key];
    }
    
    // Check if values are in window object directly
    if (window[key] !== undefined) {
      return window[key];
    }
    
    // For create-react-app style apps
    if (window.process?.env?.[key]) {
      return window.process.env[key];
    }
  }
  
  return fallback;
}

const BASE_URL =
  getEnvVar("API_BASE_URL") ||
  getEnvVar("VITE_API_BASE_URL") ||
  getEnvVar("REACT_APP_API_BASE_URL") ||
  (IS_BROWSER
    ? "https://api.imali-defi.com/api" // Frontend fallback
    : "http://localhost:3001/api");    // Backend local fallback

/* ---------------- Axios Instance ---------------- */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Logging without import.meta.env
if (IS_BROWSER) {
  console.log(`[BotAPI] Running in BROWSER → baseURL: ${BASE_URL}`);
} else {
  console.log(`[BotAPI] Running in BACKEND → baseURL: ${BASE_URL}`);
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
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      "Network or API error";
    console.error("[BotAPI] Error:", msg);
    throw new Error(msg);
  }
}

/* ---------------- Central API Routes ---------------- */
export const BotAPI = {
  // General status
  status: () => tryApi(() => api.get("/status")),

  // Trading bot controls
  start: (payload = {}) => tryApi(() => api.post("/bot/start", payload)),
  stop: () => tryApi(() => api.post("/bot/stop")),

  // Metrics & performance
  metrics: () => tryApi(() => api.get("/metrics/pnl")),
  equity: () => tryApi(() => api.get("/metrics/equity")),
  trades: (params = { limit: 50 }) =>
    tryApi(() => api.get("/trades/recent", { params })),
  positions: () => tryApi(() => api.get("/positions/open")),

  // User settings
  settings: (payload) => tryApi(() => api.post("/settings", payload)),

  // User account
  activate: (token) => tryApi(() => api.post("/users/activate", { token })),
  signup: (payload) => tryApi(() => api.post("/users/signup", payload)),
  login: (payload) => tryApi(() => api.post("/users/login", payload)),
};

export default BotAPI;
