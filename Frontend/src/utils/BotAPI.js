// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

const api = axios.create({
  baseURL: API_BASE,
});

// Attach token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

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

  async activationStatus() {
    const res = await api.get("/api/me/activation-status");
    return res.data;
  }
};

export default BotAPI;
