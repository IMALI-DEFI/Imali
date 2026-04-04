// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext(null);
const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Save user to state and localStorage
  const saveUser = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  // Clear all auth data
  const clearAuth = useCallback(() => {
    setUser(null);
    setActivation(null);
    BotAPI.clearToken();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }, []);

  // Refresh activation status
  const refreshActivation = useCallback(async () => {
    try {
      const status = await BotAPI.getActivationStatus();
      setActivation(status);
      return status;
    } catch (err) {
      console.warn("[Auth] Failed to refresh activation:", err);
      return null;
    }
  }, []);

  // Load user from API or localStorage
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      clearAuth();
      setLoading(false);
      return null;
    }

    // Try to get user from localStorage first
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem(USER_KEY);
      }
    }

    try {
      const response = await BotAPI.getMe();
      const userData = response?.user || response?.data?.user || response;
      
      if (userData && userData.id) {
        saveUser(userData);
        await refreshActivation();
        return userData;
      } else {
        clearAuth();
        return null;
      }
    } catch (err) {
      console.error("[Auth] Load user failed:", err);
      // Keep stored user as fallback, but clear if 401
      if (err?.response?.status === 401) {
        clearAuth();
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearAuth, saveUser, refreshActivation]);

  // Initial load
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Signup
  const signup = useCallback(async (userData) => {
    setError(null);
    try {
      const result = await BotAPI.signup(userData);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      // Extract user from response
      const newUser = result.data?.user || result.data?.data?.user;
      const token = result.token;
      
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      
      if (newUser) {
        saveUser(newUser);
      }
      
      await refreshActivation();
      
      return { success: true, user: newUser };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Signup failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [saveUser, refreshActivation]);

  // Login
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await BotAPI.login(email, password);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const userData = result.data?.user || result.data?.data?.user;
      const token = result.token;
      
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      
      if (userData) {
        saveUser(userData);
      }
      
      await refreshActivation();
      
      return { success: true, user: userData };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [saveUser, refreshActivation]);

  // Logout
  const logout = useCallback(() => {
    clearAuth();
    window.location.href = "/login";
  }, [clearAuth]);

  // Computed values
  const activationComplete = activation?.trading_enabled === true;
  const hasCardOnFile = activation?.has_card_on_file === true || activation?.billing_complete === true;
  const isAuthenticated = !!user && !!localStorage.getItem(TOKEN_KEY);
  const isAdmin = user?.is_admin === true || user?.email === "wayne@imali-defi.com";

  const value = useMemo(() => ({
    user,
    activation,
    loading,
    error,
    isAuthenticated,
    activationComplete,
    hasCardOnFile,
    isAdmin,
    signup,
    login,
    logout,
    loadUser,
    refreshActivation,
    clearAuth,
  }), [user, activation, loading, error, isAuthenticated, activationComplete, hasCardOnFile, isAdmin, signup, login, logout, loadUser, refreshActivation, clearAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
