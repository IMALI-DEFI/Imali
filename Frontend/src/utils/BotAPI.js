// src/utils/BotAPI.js
import axios from "axios";

const API_BASE =
  process.env.REACT_APP_API_BASE_URL ||
  "https://api.imali-defi.com";

const TOKEN_KEY = "IMALI_TOKEN";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Optional: auto-clear token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      console.warn("Unauthorized → clearing token");
      localStorage.removeItem(TOKEN_KEY);
    }
    return Promise.reject(error);
  }
);

const BotAPI = {
  // ===== Token helpers =====
  setToken(token) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  // ===== Auth =====
  async signup(data) {
    const res = await api.post("/api/signup", data);
    return res.data;
  },

  async login(data) {
    const res = await api.post("/api/auth/login", data);

    if (res.data?.token) {
      this.setToken(res.data.token);
    }

    return res.data;
  },

  async me() {
    const res = await api.get("/api/me");
    return res.data;
  },
};

export default BotAPI;
