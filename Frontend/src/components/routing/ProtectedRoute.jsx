// src/components/routing/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import axios from "axios";

const TOKEN_KEY = "imali_token";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com";

export default function ProtectedRoute() {
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState({
    loading: true,
    isValid: false,
    error: null
  });

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        setAuthStatus({ loading: false, isValid: false, error: "No token found" });
        return;
      }

      // Check token format first
      if (!checkTokenFormat(token)) {
        clearInvalidToken();
        setAuthStatus({ loading: false, isValid: false, error: "Invalid token format" });
        return;
      }

      // Check expiration client-side first (optional optimization)
      if (isTokenExpired(token)) {
        clearInvalidToken();
        setAuthStatus({ loading: false, isValid: false, error: "Token expired" });
        return;
      }

      // Validate with server - this is the most important part
      const serverValid = await validateTokenWithServer(token);
      
      if (!serverValid) {
        clearInvalidToken();
        setAuthStatus({ loading: false, isValid: false, error: "Invalid token" });
        return;
      }

      // Token is valid
      setAuthStatus({ loading: false, isValid: true, error: null });
      
    } catch (error) {
      console.error("Token validation error:", error);
      clearInvalidToken();
      setAuthStatus({ 
        loading: false, 
        isValid: false, 
        error: error.message || "Authentication failed" 
      });
    }
  };

  const validateTokenWithServer = async (token) => {
    try {
      // Use the health endpoint first to check if server is reachable
      try {
        await axios.get(`${API_BASE}/api/health`, {
          timeout: 5000
        });
      } catch (healthError) {
        console.warn("Health check failed, continuing with auth check anyway");
      }

      // Try to get user data - this validates the token
      const response = await axios.get(`${API_BASE}/api/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });

      // Check if response indicates success
      return response.status >= 200 && response.status < 300;
      
    } catch (error) {
      console.error("Server validation failed:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      
      // Return false for authentication errors
      if (error.response?.status === 401) {
        return false;
      }
      
      // For network errors, we might want to still allow access
      // depending on your requirements
      if (!error.response) {
        console.warn("Network error, cannot validate token with server");
        // In development, you might want to return true to continue
        // In production, you might want more strict checks
        return process.env.NODE_ENV === 'development';
      }
      
      return false;
    }
  };

  const clearInvalidToken = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      // Also clear any other auth-related items
      ['user_data', 'auth_state'].forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error("Failed to clear token:", error);
    }
  };

  // Show loading state
  if (authStatus.loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 animate-pulse">Verifying your session...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Token is invalid, redirect to login
  if (!authStatus.isValid) {
    const redirectPath = location.pathname;
    const errorMessage = authStatus.error || "Your session has expired";
    
    // Store the redirect path for after login
    if (redirectPath && redirectPath !== '/login') {
      sessionStorage.setItem('redirectAfterLogin', redirectPath);
    }
    
    // Store error message to show on login page
    sessionStorage.setItem('authError', errorMessage);

    return (
      <Navigate
        to="/login"
        replace
        state={{ 
          from: redirectPath,
          error: errorMessage
        }}
      />
    );
  }

  // Token is valid, render the protected routes
  return <Outlet />;
}

// Helper function: Check token format
function checkTokenFormat(token) {
  if (!token || typeof token !== "string") return false;
  
  // Trim whitespace
  token = token.trim();
  if (!token) return false;
  
  // Check for valid prefixes
  const validPrefixes = ['jwt:', 'wallet:', 'google:'];
  const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
  
  if (hasValidPrefix) {
    // Check if there's actual content after prefix
    const prefix = validPrefixes.find(p => token.startsWith(p));
    const content = token.substring(prefix.length);
    return content.length > 10; // JWT should be longer
  }
  
  // Check if it's a raw JWT (3 parts separated by dots)
  if (token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 3) {
      // Check each part looks like base64
      return parts.every(part => {
        try {
          // Try to decode as base64
          atob(part.replace(/-/g, '+').replace(/_/g, '/'));
          return true;
        } catch {
          return false;
        }
      });
    }
  }
  
  return false;
}

// Helper function: Check if token is expired (client-side only)
function isTokenExpired(token) {
  try {
    // Extract JWT payload
    let jwtToken = token;
    
    // Remove prefixes
    if (token.startsWith('jwt:')) jwtToken = token.substring(4);
    else if (token.startsWith('wallet:')) jwtToken = token.substring(7);
    else if (token.startsWith('google:')) jwtToken = token.substring(7);
    
    // Decode JWT
    const base64Url = jwtToken.split('.')[1];
    if (!base64Url) return true;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // Check expiration
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferSeconds = 60; // 1 minute buffer
      return currentTime >= (payload.exp - bufferSeconds);
    }
    
    // No expiration time, can't determine
    return false;
  } catch (error) {
    console.warn("Could not check token expiration:", error);
    // If we can't decode, assume it's invalid
    return true;
  }
}

// Helper function: Format token for storage
export function formatTokenForStorage(token) {
  if (!token || typeof token !== "string") return null;
  
  token = token.trim();
  
  // If it already has a valid prefix, return as-is
  if (token.startsWith('jwt:') || token.startsWith('wallet:') || token.startsWith('google:')) {
    return token;
  }
  
  // If it looks like a JWT, add jwt: prefix
  if (token.includes('.') && token.split('.').length === 3) {
    return `jwt:${token}`;
  }
  
  // Otherwise, return as-is (might be API key or other format)
  return token;
}

// Helper function: Get token with formatting
export function getFormattedToken() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    return formatTokenForStorage(token);
  } catch {
    return null;
  }
}

// Helper function: Set token with proper formatting
export function setAuthToken(token) {
  try {
    const formatted = formatTokenForStorage(token);
    if (!formatted) return false;
    
    localStorage.setItem(TOKEN_KEY, formatted);
    return true;
  } catch (error) {
    console.error("Failed to set auth token:", error);
    return false;
  }
}
