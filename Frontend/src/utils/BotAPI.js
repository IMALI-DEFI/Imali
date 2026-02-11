// src/utils/BotAPI.js
import axios from "axios";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* ================= TOKEN ================= */
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => token && localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);
export const isLoggedIn = () => !!getToken();

/* ================= AXIOS ================= */
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

/* Attach RAW JWT only */
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* DO NOT auto-logout during onboarding */
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

/* ================= API ================= */
const unwrap = async (fn) => {
  const res = await fn();
  return res.data;
};

const BotAPI = {
  signup: (payload) => unwrap(() => api.post("/signup", payload)),

  login: async (payload) => {
    const data = await unwrap(() => api.post("/auth/login", payload));
    if (data?.token) setToken(data.token);
    return data;
  },

  me: () => unwrap(() => api.get("/me")),
  activationStatus: () => unwrap(() => api.get("/me/activation-status")),
  billingSetupIntent: (p) => unwrap(() => api.post("/billing/setup-intent", p)),

  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
