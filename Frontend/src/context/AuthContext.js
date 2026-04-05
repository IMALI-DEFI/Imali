// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  const [isInitialized, setIsInitialized] = useState(false);
  const loadAttempted = useRef(false);

  // Save user to state and localStorage
  const saveUser = useCallback((userData) => {
    if (userData && (userData.id || userData.email)) {
      setUser(userData);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch (e) {
        console.warn("[Auth] Failed to save user to localStorage:", e);
      }
    } else {
      setUser(null);
      try {
        localStorage.removeItem(USER_KEY);
      } catch (e) {
        console.warn("[Auth] Failed to remove user from localStorage:", e);
      }
    }
  }, []);

  // Clear all auth data
  const clearAuth = useCallback(() => {
    setUser(null);
    setActivation(null);
    setError(null);
    BotAPI.clearToken();
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn("[Auth] Failed to clear localStorage:", e);
    }
  }, []);

  // Refresh activation status
  const refreshActivation = useCallback(async () => {
    try {
      const status = await BotAPI.getActivationStatus();
      setActivation(status);
      return status;
    } catch (err) {
      console.warn("[Auth] Failed to refresh activation:", err?.message || err);
      // Return default activation status instead of failing
      const defaultStatus = {
        has_card_on_file: false,
        billing_complete: false,
        trading_enabled: false,
        okx_connected: false,
        alpaca_connected: false,
        wallet_connected: false,
      };
      setActivation(defaultStatus);
      return defaultStatus;
    }
  }, []);

  // Load user from API
  const loadUser = useCallback(async (skipCache = false) => {
    const token = BotAPI.getToken();
    
    if (!token) {
      clearAuth();
      setLoading(false);
      setIsInitialized(true);
      return null;
    }

    // Check if we already have a cached user and don't need to reload
    if (!skipCache && user && user.id) {
      setLoading(false);
      setIsInitialized(true);
      return user;
    }

    try {
      const userData = await BotAPI.getMe();
      
      if (userData && (userData.id || userData.email)) {
        saveUser(userData);
        await refreshActivation();
        setError(null);
        setLoading(false);
        setIsInitialized(true);
        return userData;
      } else {
        // Token exists but no user data - clear auth
        console.warn("[Auth] Token exists but no user data returned");
        clearAuth();
        setLoading(false);
        setIsInitialized(true);
        return null;
      }
    } catch (err) {
      console.error("[Auth] Load user failed:", err?.message || err);
      
      // Only clear auth if it's a 401 unauthorized error
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearAuth();
      } else {
        // For network errors, keep the existing user if available
        if (!user) {
          clearAuth();
        }
      }
      
      setError(err?.response?.data?.message || err?.message || "Failed to load user");
      setLoading(false);
      setIsInitialized(true);
      return null;
    }
  }, [clearAuth, saveUser, refreshActivation, user]);

  // Initial load - only once
  useEffect(() => {
    if (!loadAttempted.current) {
      loadAttempted.current = true;
      loadUser();
    }
  }, [loadUser]);

  // Signup
  const signup = useCallback(async (userData) => {
    setError(null);
    try {
      const result = await BotAPI.signup(userData);
      
      if (!result.success) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        BotAPI.setToken(token);
      }
      
      // After signup, load the user profile
      const loadedUser = await loadUser(true);
      
      return { success: true, user: loadedUser, token };
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
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        BotAPI.setToken(token);
      }
      
      // After login, load the user profile
      const loadedUser = await loadUser(true);
      
      return { success: true, user: loadedUser, token };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadUser]);

  // Logout
  const logout = useCallback(async () => {
    clearAuth();
    // Optional: Call logout endpoint if needed
    // await BotAPI.logout().catch(console.warn);
    window.location.href = "/login";
  }, [clearAuth]);

  // Update activation status (after billing or connections)
  const updateActivation = useCallback(async (updates) => {
    setActivation(prev => ({ ...prev, ...updates }));
    // Refresh to get latest from server
    await refreshActivation();
  }, [refreshActivation]);

  // Computed values
  const activationComplete = useMemo(() => {
    return activation?.trading_enabled === true;
  }, [activation?.trading_enabled]);
  
  const hasCardOnFile = useMemo(() => {
    return activation?.has_card_on_file === true || activation?.billing_complete === true;
  }, [activation?.has_card_on_file, activation?.billing_complete]);
  
  const isAuthenticated = useMemo(() => {
    return !!BotAPI.getToken();
  }, []);
  
  const isAdmin = useMemo(() => {
    return user?.is_admin === true || user?.email === "wayne@imali-defi.com";
  }, [user?.is_admin, user?.email]);

  const isLoading = loading || !isInitialized;

  const value = useMemo(() => ({
    user,
    activation,
    loading: isLoading,
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
    updateActivation,
    clearAuth,
  }), [
    user,
    activation,
    isLoading,
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
    updateActivation,
    clearAuth,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
