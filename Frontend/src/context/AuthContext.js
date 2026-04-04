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
      setActivation({
        has_card_on_file: false,
        billing_complete: false,
        trading_enabled: false,
        okx_connected: false,
        alpaca_connected: false,
        wallet_connected: false,
      });
      return null;
    }
  }, []);

  // Load user from API
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    
    if (!token) {
      clearAuth();
      setLoading(false);
      return null;
    }

    try {
      const userData = await BotAPI.getMe();
      
      if (userData && (userData.id || userData.email)) {
        saveUser(userData);
        await refreshActivation();
        setLoading(false);
        return userData;
      } else {
        // Token exists but no user data - clear auth
        clearAuth();
        setLoading(false);
        return null;
      }
    } catch (err) {
      console.error("[Auth] Load user failed:", err);
      
      // Only clear auth if it's a 401 unauthorized error
      if (err?.response?.status === 401) {
        clearAuth();
      }
      
      setLoading(false);
      return null;
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
      
      const token = result.token;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      
      // After signup, load the user profile
      const loadedUser = await loadUser();
      
      return { success: true, user: loadedUser };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Signup failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadUser]);

  // Login
  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const result = await BotAPI.login(email, password);
      
      if (!result.success) {
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      
      // After login, load the user profile
      const loadedUser = await loadUser();
      
      return { success: true, user: loadedUser };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadUser]);

  // Logout
  const logout = useCallback(() => {
    clearAuth();
    window.location.href = "/login";
  }, [clearAuth]);

  // Computed values
  const activationComplete = activation?.trading_enabled === true;
  const hasCardOnFile = activation?.has_card_on_file === true || activation?.billing_complete === true;
  const isAuthenticated = !!localStorage.getItem(TOKEN_KEY);
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
