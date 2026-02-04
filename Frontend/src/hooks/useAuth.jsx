// src/hooks/useAuth.js
import { useEffect, useState } from "react";

/**
 * Basic auth hook
 * - Reads JWT from localStorage
 * - Exposes user + auth helpers
 * - Does NOT assume Firebase or backend availability
 */
export function useAuth() {
  const [token, setToken] = useState(() =>
    typeof window !== "undefined"
      ? localStorage.getItem("auth_token")
      : null
  );

  const [isAuthenticated, setIsAuthenticated] = useState(!!token);

  useEffect(() => {
    setIsAuthenticated(!!token);
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem("auth_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
  };

  return {
    token,
    isAuthenticated,
    login,
    logout,
  };
}