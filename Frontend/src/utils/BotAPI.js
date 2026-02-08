// src/utils/BotAPI.js
import axios from "axios";

const IS_BROWSER = typeof window !== "undefined";
const TOKEN_KEY = "imali_token";

/* =========================
   Token helpers (PUBLIC)
========================= */
export function getToken() {
  if (!IS_BROWSER) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!IS_BROWSER) return;
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (!IS_BROWSER) return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn() {
  return !!getToken();
}

/* =========================
   API base
========================= */
function resolveApiBase() {
  return (
    process.env.REACT_APP_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    "https://api.imali-defi.com"
  );
}

const api = axios.create({
  baseURL: `${resolveApiBase()}/api`,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

/* =========================
   Interceptors
========================= */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401 && IS_BROWSER) {
      console.warn("[BotAPI] Unauthorized, clearing token");
      clearToken();
    }

    return Promise.reject(err);
  }
);

/* =========================
   Helper
========================= */
async function unwrap(promise) {
  try {
    const res = await promise;
    return res.data;
  } catch (err) {
    const e = new Error(
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Request failed"
    );
    e.status = err?.response?.status;
    throw e;
  }
}

/* =========================
   Public API
========================= */
const BotAPI = {
  // token helpers (IMPORTANT)
  getToken,
  setToken,
  clearToken,
  isLoggedIn,

  // auth
  signup: (p) => unwrap(api.post("/signup", p)),
  login: async (p) => {
    const data = await unwrap(api.post("/auth/login", p));
    if (data?.token) setToken(data.token);
    return data;
  },

  logout: () => clearToken(),

  // user
  me: () => unwrap(api.get("/me")),
  activationStatus: () => unwrap(api.get("/me/activation-status")),

  // billing
  billingSetupIntent: () => unwrap(api.post("/billing/setup-intent")),
};

export default BotAPI;
