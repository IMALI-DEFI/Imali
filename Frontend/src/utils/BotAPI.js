// src/utils/BotAPI.js
import axios from "axios";

const API_BASE = "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";
const REFRESH_TOKEN_KEY = "imali_refresh_token";

const api = axios.create({
  baseURL: API_BASE,
});

// Helper to check if token is expired
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

// Attach token automatically with expiration check
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (token) {
    // Check if token is expired
    if (isTokenExpired(token)) {
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
          const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshResponse.data?.token) {
            localStorage.setItem(TOKEN_KEY, refreshResponse.data.token);
            config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            return config;
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        // Redirect to login if needed
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    } else {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear tokens on unauthorized
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const BotAPI = {
  // ===== Token helpers =====
  setToken(token, refreshToken = null) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token && !isTokenExpired(token);
  },

  // ===== Auth =====
  async signup(data) {
    const res = await api.post("/api/signup", data);
    return res.data;
  },

  async login(data) {
    const res = await api.post("/api/auth/login", data);
    
    if (res.data?.token) {
      this.setToken(res.data.token, res.data.refresh_token);
    }
    
    return res.data;
  },

  async me() {
    try {
      const res = await api.get("/api/me");
      return res.data;
    } catch (error) {
      if (error.response?.status === 401) {
        this.clearToken();
        throw new Error('Session expired');
      }
      throw error;
    }
  },

  async activationStatus() {
    const res = await api.get("/api/me/activation-status");
    return res.data;
  },
  
  // New method to explicitly refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const res = await api.post("/api/auth/refresh", {
      refresh_token: refreshToken
    });
    
    if (res.data?.token) {
      this.setToken(res.data.token, res.data.refresh_token || refreshToken);
    }
    
    return res.data;
  }
};

export default BotAPI;
