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
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Add 30 second buffer to avoid edge cases
    return payload.exp * 1000 < Date.now() + 30000;
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
      console.log('Token expired, attempting refresh...');
      
      // Try to refresh token - but only if we have a refresh token
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          if (refreshResponse.data?.token) {
            console.log('Token refreshed successfully');
            localStorage.setItem(TOKEN_KEY, refreshResponse.data.token);
            if (refreshResponse.data?.refresh_token) {
              localStorage.setItem(REFRESH_TOKEN_KEY, refreshResponse.data.refresh_token);
            }
            config.headers.Authorization = `Bearer ${refreshResponse.data.token}`;
            return config;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError.response?.status, refreshError.message);
          
          // If refresh fails with 401/404, the refresh token is invalid or endpoint doesn't exist
          if (refreshError.response?.status === 401 || refreshError.response?.status === 404) {
            console.log('Refresh token invalid or endpoint not found, clearing session');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            
            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
              window.location.href = '/login';
            }
          }
          
          // Don't proceed with the original request
          throw new Error('Session expired');
        }
      } else {
        // No refresh token, just clear and redirect
        console.log('No refresh token available, session expired');
        localStorage.removeItem(TOKEN_KEY);
        
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
          window.location.href = '/login';
        }
        throw new Error('Session expired');
      }
    } else {
      // Token is valid, use it
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't handle 401 for login/signup endpoints
    const url = error.config?.url || '';
    if (url.includes('/api/auth/login') || url.includes('/api/signup')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      console.log('Received 401, clearing session');
      // Clear tokens on unauthorized
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/signup')) {
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
    // Set default header immediately
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    delete api.defaults.headers.common['Authorization'];
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
    try {
      // Clear any existing tokens first
      this.clearToken();
      
      const res = await api.post("/api/auth/login", data);
      
      if (res.data?.token) {
        this.setToken(res.data.token, res.data.refresh_token);
        console.log('Login successful, token set');
      } else {
        console.warn('Login response missing token:', res.data);
      }
      
      return res.data;
    } catch (error) {
      console.error('Login API error:', error.response?.status, error.response?.data || error.message);
      throw error;
    }
  },

  async me() {
    try {
      const token = this.getToken();
      if (!token) {
        throw new Error('No token found');
      }
      
      // Ensure headers are set
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const res = await api.get("/api/me");
      return res.data;
    } catch (error) {
      console.error('me() error:', error.response?.status, error.message);
      if (error.response?.status === 401) {
        this.clearToken();
        throw new Error('Session expired. Please log in again.');
      }
      throw error;
    }
  },

  async activationStatus() {
    try {
      const res = await api.get("/api/me/activation-status");
      return res.data;
    } catch (error) {
      console.error('activationStatus() error:', error.response?.status, error.message);
      throw error;
    }
  },
  
  // Optional: disable refresh if your backend doesn't support it
  async refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    try {
      const res = await api.post("/api/auth/refresh", {
        refresh_token: refreshToken
      });
      
      if (res.data?.token) {
        this.setToken(res.data.token, res.data.refresh_token || refreshToken);
        return res.data;
      }
    } catch (error) {
      console.error('Refresh token failed:', error.response?.status, error.message);
      // If endpoint doesn't exist (404), disable refresh functionality
      if (error.response?.status === 404) {
        console.warn('Refresh endpoint not available - refresh disabled');
        // Store a flag to not attempt refresh again
        localStorage.setItem('refresh_disabled', 'true');
      }
      throw error;
    }
  },

  // Add this method to check if refresh is supported
  isRefreshSupported() {
    return localStorage.getItem('refresh_disabled') !== 'true';
  }
};

export default BotAPI;
