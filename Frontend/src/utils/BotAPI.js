// src/utils/BotAPI.js
import axios from "axios";

// =========================
// CONFIGURATION
// =========================
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

// =========================
// AXIOS INSTANCE
// =========================
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// =========================
// TOKEN MANAGEMENT
// =========================
const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const setStoredToken = (token) => {
  if (!token || typeof token !== "string") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } catch {}
};

const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  delete api.defaults.headers.common["Authorization"];
};

// =========================
// REQUEST INTERCEPTORS
// =========================
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// RESPONSE INTERCEPTOR
// =========================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    
    console.error(`[API Error] ${status} - ${url}:`, error?.response?.data || error.message);
    
    // Clear token on 401
    if (status === 401) {
      clearStoredToken();
    }
    
    return Promise.reject(error);
  }
);

// =========================
// API CLIENT
// =========================
const BotAPI = {
  // Token management
  setToken: setStoredToken,
  getToken: getStoredToken,
  clearToken: clearStoredToken,
  isLoggedIn: () => !!getStoredToken(),
  clearCache: () => {}, // No-op for now

  // ========================
  // AUTHENTICATION
  // ========================
  async signup(userData) {
    try {
      const response = await api.post("/api/signup", userData);
      // Your API returns { success: true, data: {...}, message: "..." }
      const data = response.data;
      
      if (data?.data?.token) {
        this.setToken(data.data.token);
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      throw error;
    }
  },

  async login(credentials) {
    try {
      const response = await api.post("/api/auth/login", credentials);
      // Your API returns { success: true, data: {...}, message: "..." }
      const data = response.data;
      
      if (data?.data?.token) {
        this.setToken(data.data.token);
      }
      
      return { success: true, data: data.data };
    } catch (error) {
      throw error;
    }
  },

  async me() {
    try {
      const response = await api.get("/api/me");
      // Your API returns { success: true, user: {...} }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async activationStatus() {
    try {
      const response = await api.get("/api/me/activation-status");
      // Your API returns { success: true, status: {...} }
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default BotAPI;
