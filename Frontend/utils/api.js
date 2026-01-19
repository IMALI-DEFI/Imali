// src/utils/BotAPI.js
import axios from "axios";

/* ---------------- Environment Helpers ---------------- */
const IS_BROWSER = typeof window !== "undefined";

function getEnv(key, fallback = "") {
  // works both in Vite (frontend) & Node (backend)
  if (typeof import.meta !== "undefined" && import.meta.env && key in import.meta.env)
    return import.meta.env[key] || fallback;
  if (typeof process !== "undefined" && process.env && key in process.env)
    return process.env[key] || fallback;
  return fallback;
}

const BASE_URL =
  getEnv("VITE_API_BASE_URL") ||
  getEnv("REACT_APP_API_BASE_URL") ||
  (IS_BROWSER
    ? "https://api.imali-defi.com/api" // Frontend fallback
    : "http://localhost:3001/api");    // Backend local fallback

/* ---------------- Axios Instance ---------------- */
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

if (IS_BROWSER && import.meta.env?.MODE === "development") {
  console.log(`[BotAPI] Running in BROWSER → baseURL: ${BASE_URL}`);
} else if (!IS_BROWSER) {
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