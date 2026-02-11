import axios from "axios";

const TOKEN_KEY = "imali_token";
const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

/* =========================
   TOKEN HELPERS
========================= */

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token) => {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isLoggedIn = () => !!getToken();

/* =========================
   AXIOS INSTANCE
========================= */

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

/* =========================
   REQUEST INTERCEPTOR
========================= */

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   RESPONSE WRAPPER
========================= */

const unwrap = async (fn) => {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const error = new Error(
      err?.response?.data?.message ||
      err?.message ||
      "Request failed"
    );
    error.status = err?.response?.status;
    throw error;
  }
};

/* =========================
   BOT API
========================= */

const BotAPI = {
  signup: (payload) =>
    unwrap(() => api.post("/signup", payload)),

  login: async (payload) => {
    const data = await unwrap(() =>
      api.post("/auth/login", payload)
    );

    if (data?.token) {
      setToken(data.token); // STORE RAW TOKEN
    }

    return data;
  },

  me: () => unwrap(() => api.get("/me")),

  activationStatus: () =>
    unwrap(() => api.get("/me/activation-status")),

  billingSetupIntent: (payload) =>
    unwrap(() => api.post("/billing/setup-intent", payload)),

  logout: () => {
    clearToken();
    window.location.href = "/login";
  },

  getToken,
  setToken,
  clearToken,
  isLoggedIn,
};

export default BotAPI;
