// src/utils/authUtils.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";
const TOKEN_KEY = "imali_token";

// Check if user is authenticated (with server validation)
export const checkAuthStatus = async () => {
  try {
    const token = getToken();
    if (!token) return { authenticated: false, user: null };
    
    // Try to fetch user data from server
    const response = await axios.get(`${API_BASE}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 10000
    });
    
    return { 
      authenticated: true, 
      user: response.data.user,
      data: response.data 
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    
    // Clear invalid token
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    
    return { authenticated: false, user: null, error: error.message };
  }
};

// Get token with proper formatting
export const getToken = () => {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    // Ensure proper formatting
    if (!token.startsWith("jwt:") && !token.startsWith("wallet:") && !token.startsWith("google:")) {
      if (token.includes(".") && token.split(".").length === 3) {
        // It's a raw JWT, add prefix
        token = `jwt:${token}`;
        localStorage.setItem(TOKEN_KEY, token);
      }
    }
    
    return token;
  } catch {
    return null;
  }
};

// Set token with validation
export const setToken = (token) => {
  if (!token || typeof token !== "string") {
    console.error("Invalid token provided");
    return false;
  }
  
  try {
    // Store the token as-is (the server will handle prefix validation)
    localStorage.setItem(TOKEN_KEY, token);
    return true;
  } catch (error) {
    console.error("Failed to set token:", error);
    return false;
  }
};

// Clear token
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
};

// Decode JWT token (for client-side info)
export const decodeToken = (token) => {
  try {
    let jwtToken = token;
    
    // Remove prefix if present
    if (token.startsWith("jwt:")) {
      jwtToken = token.substring(4);
    } else if (token.startsWith("wallet:")) {
      jwtToken = token.substring(7);
    } else if (token.startsWith("google:")) {
      jwtToken = token.substring(7);
    }
    
    const base64Url = jwtToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};