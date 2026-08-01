// src/services/api.js
import axios from 'axios';

// Base URL for your API - change this to your actual backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.imali-defi.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle unauthorized errors (401)
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    // Handle rate limiting (429)
    if (error.response && error.response.status === 429) {
      console.error('Rate limit exceeded. Please try again later.');
    }
    
    // Handle server errors (500)
    if (error.response && error.response.status >= 500) {
      console.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

// API service methods
const apiService = {
  // GET request
  get: async (url, params = {}) => {
    try {
      const response = await api.get(url, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // POST request
  post: async (url, data = {}) => {
    try {
      const response = await api.post(url, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // PUT request
  put: async (url, data = {}) => {
    try {
      const response = await api.put(url, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // PATCH request
  patch: async (url, data = {}) => {
    try {
      const response = await api.patch(url, data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // DELETE request
  delete: async (url) => {
    try {
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Upload file
  upload: async (url, formData, onProgress) => {
    try {
      const response = await api.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Set auth token
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  },

  // Set current user
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },

  // Logout
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
};

export default apiService;