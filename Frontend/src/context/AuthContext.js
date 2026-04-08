// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import BotAPI from "../utils/BotAPI";

const AuthContext = createContext(null);
const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";
const ACTIVATION_KEY = "imali_activation";

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
  const [refreshing, setRefreshing] = useState(false);
  const loadAttempted = useRef(false);
  const refreshTimeoutRef = useRef(null);
  const lastRefreshTime = useRef(0);
  const REFRESH_COOLDOWN_MS = 30000; // 30 seconds cooldown

  // Save user to state and localStorage with validation
  const saveUser = useCallback((userData) => {
    if (!userData || (!userData.id && !userData.email)) {
      console.warn("[Auth] Invalid user data, clearing user");
      setUser(null);
      try {
        localStorage.removeItem(USER_KEY);
      } catch (e) {
        console.warn("[Auth] Failed to remove user from localStorage:", e);
      }
      return;
    }

    // Validate required fields
    const validatedUser = {
      id: userData.id,
      email: userData.email,
      tier: userData.tier || "starter",
      strategy: userData.strategy || "ai_weighted",
      trading_enabled: userData.trading_enabled || false,
      is_admin: userData.is_admin || false,
      has_card_on_file: userData.has_card_on_file || false,
      billing_complete: userData.billing_complete || false,
      referral_code: userData.referral_code || null,
      api_key: userData.api_key || null,
      wallet_addresses: userData.wallet_addresses || [],
      portfolio_value: userData.portfolio_value || 1000,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    };

    setUser(validatedUser);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(validatedUser));
    } catch (e) {
      console.warn("[Auth] Failed to save user to localStorage:", e);
    }
  }, []);

  // Save activation to cache
  const saveActivation = useCallback((activationData) => {
    if (!activationData) return;
    
    const validatedActivation = {
      tier: activationData.tier || "starter",
      has_card_on_file: activationData.has_card_on_file || false,
      billing_complete: activationData.billing_complete || false,
      trading_enabled: activationData.trading_enabled || false,
      wallet_connected: activationData.wallet_connected || false,
      okx_connected: activationData.okx_connected || false,
      alpaca_connected: activationData.alpaca_connected || false,
      activation_complete: activationData.activation_complete || false,
      tier_requirements_met: activationData.tier_requirements_met || false,
      tier_required_integration: activationData.tier_required_integration || "Alpaca & OKX (both)"
    };
    
    setActivation(validatedActivation);
    try {
      localStorage.setItem(ACTIVATION_KEY, JSON.stringify(validatedActivation));
    } catch (e) {
      console.warn("[Auth] Failed to save activation to localStorage:", e);
    }
  }, []);

  // Load cached user data (for faster initial load)
  const loadCachedUser = useCallback(() => {
    try {
      const cachedUser = localStorage.getItem(USER_KEY);
      if (cachedUser) {
        const parsed = JSON.parse(cachedUser);
        if (parsed && parsed.id) {
          setUser(parsed);
        }
      }
      
      const cachedActivation = localStorage.getItem(ACTIVATION_KEY);
      if (cachedActivation) {
        const parsed = JSON.parse(cachedActivation);
        if (parsed) {
          setActivation(parsed);
        }
      }
    } catch (e) {
      console.warn("[Auth] Failed to load cached data:", e);
    }
  }, []);

  // Clear all auth data
  const clearAuth = useCallback(() => {
    setUser(null);
    setActivation(null);
    setError(null);
    setRefreshing(false);
    BotAPI.clearToken();
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(ACTIVATION_KEY);
    } catch (e) {
      console.warn("[Auth] Failed to clear localStorage:", e);
    }
  }, []);

  // Refresh activation status with cooldown
  const refreshActivation = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Check cooldown
    if (!force && (now - lastRefreshTime.current) < REFRESH_COOLDOWN_MS) {
      console.debug("[Auth] Refresh activation cooldown, using cached");
      return activation;
    }
    
    if (refreshing && !force) {
      console.debug("[Auth] Already refreshing activation");
      return activation;
    }
    
    setRefreshing(true);
    lastRefreshTime.current = now;
    
    try {
      const token = BotAPI.getToken();
      if (!token) {
        setActivation(null);
        return null;
      }
      
      const status = await BotAPI.getActivationStatus();
      
      if (status) {
        saveActivation(status);
        return status;
      }
      
      // Return default activation status
      const defaultStatus = {
        tier: "starter",
        has_card_on_file: false,
        billing_complete: false,
        trading_enabled: false,
        okx_connected: false,
        alpaca_connected: false,
        wallet_connected: false,
        activation_complete: false,
        tier_requirements_met: false,
        tier_required_integration: "Alpaca & OKX (both)"
      };
      saveActivation(defaultStatus);
      return defaultStatus;
      
    } catch (err) {
      console.warn("[Auth] Failed to refresh activation:", err?.message || err);
      
      // If 401, clear auth
      if (err?.response?.status === 401) {
        clearAuth();
        return null;
      }
      
      // Return cached activation or default
      if (activation) return activation;
      
      const defaultStatus = {
        tier: "starter",
        has_card_on_file: false,
        billing_complete: false,
        trading_enabled: false,
        okx_connected: false,
        alpaca_connected: false,
        wallet_connected: false,
        activation_complete: false,
        tier_requirements_met: false,
        tier_required_integration: "Alpaca & OKX (both)"
      };
      return defaultStatus;
      
    } finally {
      setRefreshing(false);
    }
  }, [activation, clearAuth, saveActivation, refreshing]);

  // Load user from API
  const loadUser = useCallback(async (skipCache = false) => {
    const token = BotAPI.getToken();
    
    if (!token) {
      clearAuth();
      setLoading(false);
      setIsInitialized(true);
      return null;
    }

    // Load cached data immediately for faster UI
    if (!skipCache && !user) {
      loadCachedUser();
    }

    try {
      const userData = await BotAPI.getMe();
      
      if (userData && (userData.id || userData.email)) {
        saveUser(userData);
        
        // Load activation status in parallel
        await refreshActivation(true);
        
        setError(null);
        setLoading(false);
        setIsInitialized(true);
        return userData;
      } else {
        console.warn("[Auth] Token exists but no user data returned");
        clearAuth();
        setLoading(false);
        setIsInitialized(true);
        return null;
      }
    } catch (err) {
      console.error("[Auth] Load user failed:", err?.message || err);
      
      // Check if it's an auth error
      const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
      
      if (isAuthError) {
        clearAuth();
      } else {
        // For network errors, keep cached user if available
        if (!user) {
          clearAuth();
        }
        setError(err?.response?.data?.message || err?.message || "Failed to load user");
      }
      
      setLoading(false);
      setIsInitialized(true);
      return user || null; // Return cached user if available
    }
  }, [clearAuth, saveUser, refreshActivation, loadCachedUser, user]);

  // Initial load - only once
  useEffect(() => {
    if (!loadAttempted.current) {
      loadAttempted.current = true;
      
      // Load cached data immediately for faster perceived performance
      loadCachedUser();
      
      // Then load fresh data from API
      loadUser();
    }
    
    // Cleanup refresh timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadUser, loadCachedUser]);

  // Auto-refresh activation status periodically (every 5 minutes when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const intervalId = setInterval(() => {
      refreshActivation();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, refreshActivation]);

  // Signup with validation
  const signup = useCallback(async (userData) => {
    setError(null);
    
    // Validate input
    if (!userData.email || !userData.password) {
      const errorMsg = "Email and password are required";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    if (userData.password.length < 8) {
      const errorMsg = "Password must be at least 8 characters";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    try {
      const result = await BotAPI.signup(userData);
      
      if (!result.success) {
        setError(result.error || "Signup failed");
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        BotAPI.setToken(token);
      }
      
      // After signup, load the user profile
      const loadedUser = await loadUser(true);
      
      // Also refresh activation status
      await refreshActivation(true);
      
      return { 
        success: true, 
        user: loadedUser, 
        token,
        api_key: result.data?.user?.api_key || null
      };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Signup failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadUser, refreshActivation]);

  // Login with validation
  const login = useCallback(async (email, password) => {
    setError(null);
    
    if (!email || !password) {
      const errorMsg = "Email and password are required";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    try {
      const result = await BotAPI.login(email, password);
      
      if (!result.success) {
        setError(result.error || "Login failed");
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        BotAPI.setToken(token);
      }
      
      // After login, load the user profile
      const loadedUser = await loadUser(true);
      
      // Also refresh activation status
      await refreshActivation(true);
      
      return { success: true, user: loadedUser, token };
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      setError(message);
      return { success: false, error: message };
    }
  }, [loadUser, refreshActivation]);

  // Logout with cleanup
  const logout = useCallback(async () => {
    try {
      // Optional: Call logout endpoint to invalidate token on server
      await BotAPI.logout().catch(() => {});
    } catch (e) {
      console.warn("[Auth] Logout API call failed:", e);
    } finally {
      clearAuth();
      // Redirect to login page
      window.location.href = "/login";
    }
  }, [clearAuth]);

  // Update activation status (after billing or connections)
  const updateActivation = useCallback(async (updates) => {
    setActivation(prev => ({ ...prev, ...updates }));
    // Save to cache
    if (activation) {
      const updated = { ...activation, ...updates };
      try {
        localStorage.setItem(ACTIVATION_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("[Auth] Failed to update activation cache:", e);
      }
    }
    // Refresh to get latest from server (bypass cooldown)
    await refreshActivation(true);
  }, [activation, refreshActivation]);

  // Computed values with memoization
  const activationComplete = useMemo(() => {
    return activation?.trading_enabled === true && activation?.activation_complete === true;
  }, [activation?.trading_enabled, activation?.activation_complete]);
  
  const hasCardOnFile = useMemo(() => {
    return activation?.has_card_on_file === true || activation?.billing_complete === true;
  }, [activation?.has_card_on_file, activation?.billing_complete]);
  
  const hasRequiredIntegrations = useMemo(() => {
    if (!activation) return false;
    
    const tier = activation.tier || user?.tier || "starter";
    
    if (tier === "starter") {
      return activation.alpaca_connected && activation.okx_connected;
    } else if (tier === "elite") {
      return activation.wallet_connected;
    }
    return activation.wallet_connected || activation.alpaca_connected || activation.okx_connected;
  }, [activation, user?.tier]);
  
  const isAuthenticated = useMemo(() => {
    const token = BotAPI.getToken();
    return !!token && !!user;
  }, [user]);
  
  const isAdmin = useMemo(() => {
    return user?.is_admin === true || user?.email === "wayne@imali-defi.com";
  }, [user?.is_admin, user?.email]);

  const canTrade = useMemo(() => {
    return isAuthenticated && activationComplete && hasRequiredIntegrations;
  }, [isAuthenticated, activationComplete, hasRequiredIntegrations]);

  const isLoading = loading || (!isInitialized && loadAttempted.current);

  const value = useMemo(() => ({
    user,
    activation,
    loading: isLoading,
    refreshing,
    error,
    isAuthenticated,
    activationComplete,
    hasCardOnFile,
    hasRequiredIntegrations,
    canTrade,
    isAdmin,
    signup,
    login,
    logout,
    loadUser,
    refreshActivation,
    updateActivation,
    clearAuth,
    getApiKey: () => user?.api_key || null,
  }), [
    user,
    activation,
    isLoading,
    refreshing,
    error,
    isAuthenticated,
    activationComplete,
    hasCardOnFile,
    hasRequiredIntegrations,
    canTrade,
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
