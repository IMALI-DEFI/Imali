// src/components/routing/ProtectedRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { checkTokenValidity } from "../../utils/authUtils"; // We'll create this

const TOKEN_KEY = "imali_token";

export default function ProtectedRoute() {
  const location = useLocation();
  const [isValid, setIsValid] = useState(null); // null = loading, true = valid, false = invalid

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (!token) {
        setIsValid(false);
        return;
      }

      // Check token format
      const isValidFormat = checkTokenFormat(token);
      if (!isValidFormat) {
        clearInvalidToken();
        setIsValid(false);
        return;
      }

      // Optional: Check expiration (client-side)
      const isExpired = checkTokenExpiration(token);
      if (isExpired) {
        clearInvalidToken();
        setIsValid(false);
        return;
      }

      setIsValid(true);
    } catch (error) {
      console.error("Token validation error:", error);
      clearInvalidToken();
      setIsValid(false);
    }
  };

  const clearInvalidToken = () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  };

  if (isValid === null) {
    // Show loading spinner while checking
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ 
          from: location.pathname,
          error: "Please log in to continue"
        }}
      />
    );
  }

  return <Outlet />;
}

// Helper functions
function checkTokenFormat(token) {
  if (!token || typeof token !== "string") return false;
  
  // Acceptable token formats:
  // 1. jwt:eyJhbGciOiJIUzI1NiIs...
  // 2. wallet:eyJhbGciOiJIUzI1NiIs...
  // 3. google:eyJhbGciOiJIUzI1NiIs...
  // 4. Raw JWT (for backward compatibility)
  
  if (token.startsWith("jwt:") || token.startsWith("wallet:") || token.startsWith("google:")) {
    return token.length > 5; // At least prefix + some content
  }
  
  // Check if it's a raw JWT
  if (token.includes(".") && token.split(".").length === 3) {
    return token.length > 10;
  }
  
  return false;
}

function checkTokenExpiration(token) {
  try {
    // Extract the actual JWT part
    let jwtToken = token;
    if (token.startsWith("jwt:")) {
      jwtToken = token.substring(4);
    } else if (token.startsWith("wallet:")) {
      jwtToken = token.substring(7);
    } else if (token.startsWith("google:")) {
      jwtToken = token.substring(7);
    }
    
    // Decode JWT to check expiration (client-side only)
    const base64Url = jwtToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime >= payload.exp;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking token expiration:", error);
    return true; // If we can't decode, assume expired
  }
}
