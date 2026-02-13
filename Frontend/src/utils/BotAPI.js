// src/utils/BotAPI.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

const TOKEN_KEY = "imali_token";

// Single axios instance for entire app
const api = axios.create({
  baseURL: API_BASE,
});

/* =========================
   TOKEN HELPERS
========================= */

const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  if (!token || typeof token !== "string") return;
  localStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common["Authorization"];
};

/* =========================
   REQUEST INTERCEPTOR
   (Attach JWT)
========================= */

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* =========================
   RESPONSE INTERCEPTOR
   (Handle 401 globally)
========================= */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // Ignore login/signup endpoints
    const url = error.config?.url || "";
    const isAuthEndpoint =
      url.includes("/api/auth/login") || url.includes("/api/signup");

    if (status === 401 && !isAuthEndpoint) {
      clearStoredToken();

      if (
        !window.location.pathname.includes("/login") &&
        !window.location.pathname.includes("/signup")
      ) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

/* =========================
   API METHODS
========================= */

const BotAPI = {
  // ===== Token helpers =====
  setToken(token) {
    setStoredToken(token);
  },

  getToken() {
    return getStoredToken();
  },

  clearToken() {
    clearStoredToken();
  },

  isLoggedIn() {
    return !!getStoredToken();
  },

  // ===== Auth =====
  async signup(data) {
    const res = await api.post("/api/signup", data);
    return res.data;
  },

  async login(data) {
    // Clear old token first
    clearStoredToken();

    const res = await api.post("/api/auth/login", data);

    if (res.data?.token) {
      setStoredToken(res.data.token);
    } else {
      throw new Error("Login failed: no token returned");
    }

    return res.data;
  },

  async me() {
    const res = await api.get("/api/me");
    return res.data;
  },

  async activationStatus() {
    const res = await api.get("/api/me/activation-status");
    return res.data;
  },

  // ===== Billing (reuse same axios instance) =====
  async createSetupIntent(payload) {
    const res = await api.post("/api/billing/setup-intent", payload);
    return res.data;
  },
};

export { api };
export default BotAPI;
