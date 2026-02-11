// src/utils/billingApi.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";
const REFRESH_TOKEN_KEY = "imali_refresh_token";

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

const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

const getRefreshToken = () => {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

// Create axios instance for billing
const billingApi = axios.create({
  baseURL: `${API_BASE}/api/billing`,
  headers: { "Content-Type": "application/json" },
});

// Token refresh state to prevent multiple refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/* 🔑 ALWAYS SEND RAW JWT WITH EXPIRATION CHECK */
billingApi.interceptors.request.use(async (config) => {
  const token = getToken();
  
  if (token) {
    // Check if token is expired
    if (isTokenExpired(token)) {
      // Try to refresh token
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      // Queue requests while refreshing
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            config.headers.Authorization = `Bearer ${token}`;
            return config;
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Attempt token refresh
        const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {
          refresh_token: refreshToken
        });

        const newToken = refreshResponse.data?.token;
        const newRefreshToken = refreshResponse.data?.refresh_token;

        if (newToken) {
          localStorage.setItem(TOKEN_KEY, newToken);
          if (newRefreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
          }
          config.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return config;
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        processQueue(refreshError, null);
        window.location.href = '/login';
        throw new Error('Session expired');
      } finally {
        isRefreshing = false;
      }
    } else {
      // Token is valid, use it
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
});

// Response interceptor for handling 401 errors
billingApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post(`${API_BASE}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const newToken = refreshResponse.data?.token;
          if (newToken) {
            localStorage.setItem(TOKEN_KEY, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return billingApi(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.location.href = '/login';
        }
      } else {
        // No refresh token
        localStorage.removeItem(TOKEN_KEY);
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export async function createSetupIntent({ email, tier = "starter" }) {
  if (!email) throw new Error("Email required");

  try {
    const res = await billingApi.post("/setup-intent", {
      email: email.trim().toLowerCase(),
      tier,
    });

    if (!res.data?.client_secret) {
      throw new Error("Stripe client_secret missing");
    }

    return res.data;
  } catch (error) {
    // Handle specific error cases
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please log in again.');
    }
    throw error;
  }
}

// Also export a helper to check auth status
export const isBillingAuthenticated = () => {
  const token = getToken();
  return token && !isTokenExpired(token);
};

export default billingApi;
