// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";

const AuthContext = createContext(null);
const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";
const ACTIVATION_KEY = "imali_activation";

// Dynamically import BotAPI to avoid circular dependency
let BotAPI = null;
const getBotAPI = async () => {
  if (!BotAPI) {
    BotAPI = (await import("../utils/BotAPI")).default;
  }
  return BotAPI;
};

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
  const REFRESH_COOLDOWN_MS = 30000;

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

  // Load cached user data
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
  const clearAuth = useCallback(async () => {
    setUser(null);
    setActivation(null);
    setError(null);
    setRefreshing(false);
    
    const api = await getBotAPI();
    api.clearToken();
    
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
      const api = await getBotAPI();
      const token = api.getToken();
      
      if (!token) {
        setActivation(null);
        return null;
      }
      
      const status = await api.getActivationStatus();
      
      if (status) {
        saveActivation(status);
        return status;
      }
      
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
      
      if (err?.response?.status === 401) {
        await clearAuth();
        return null;
      }
      
      if (activation) return activation;
      
      return {
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
      
    } finally {
      setRefreshing(false);
    }
  }, [activation, clearAuth, saveActivation, refreshing]);

  // Load user from API
  const loadUser = useCallback(async (skipCache = false) => {
    const api = await getBotAPI();
    const token = api.getToken();
    
    if (!token) {
      await clearAuth();
      setLoading(false);
      setIsInitialized(true);
      return null;
    }

    if (!skipCache && !user) {
      loadCachedUser();
    }

    try {
      const userData = await api.getMe();
      
      if (userData && (userData.id || userData.email)) {
        saveUser(userData);
        await refreshActivation(true);
        setError(null);
        setLoading(false);
        setIsInitialized(true);
        return userData;
      } else {
        console.warn("[Auth] Token exists but no user data returned");
        await clearAuth();
        setLoading(false);
        setIsInitialized(true);
        return null;
      }
    } catch (err) {
      console.error("[Auth] Load user failed:", err?.message || err);
      
      const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
      
      if (isAuthError) {
        await clearAuth();
      } else {
        if (!user) {
          await clearAuth();
        }
        setError(err?.response?.data?.message || err?.message || "Failed to load user");
      }
      
      setLoading(false);
      setIsInitialized(true);
      return user || null;
    }
  }, [clearAuth, saveUser, refreshActivation, loadCachedUser, user]);

  // Initial load - only once
  useEffect(() => {
    if (!loadAttempted.current) {
      loadAttempted.current = true;
      loadCachedUser();
      loadUser();
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [loadUser, loadCachedUser]);

  // Auto-refresh activation status periodically
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const intervalId = setInterval(() => {
      refreshActivation();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, refreshActivation]);

  // Signup with validation
  const signup = useCallback(async (userData) => {
    setError(null);
    
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
      const api = await getBotAPI();
      const result = await api.signup(userData);
      
      if (!result.success) {
        setError(result.error || "Signup failed");
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        api.setToken(token);
      }
      
      const loadedUser = await loadUser(true);
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
      const api = await getBotAPI();
      const result = await api.login(email, password);
      
      if (!result.success) {
        setError(result.error || "Login failed");
        return { success: false, error: result.error };
      }
      
      const token = result.token;
      if (token) {
        api.setToken(token);
      }
      
      const loadedUser = await loadUser(true);
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
      const api = await getBotAPI();
      await api.logout().catch(() => {});
    } catch (e) {
      console.warn("[Auth] Logout API call failed:", e);
    } finally {
      await clearAuth();
      window.location.href = "/login";
    }
  }, [clearAuth]);

  // Update activation status
  const updateActivation = useCallback(async (updates) => {
    setActivation(prev => ({ ...prev, ...updates }));
    if (activation) {
      const updated = { ...activation, ...updates };
      try {
        localStorage.setItem(ACTIVATION_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("[Auth] Failed to update activation cache:", e);
      }
    }
    await refreshActivation(true);
  }, [activation, refreshActivation]);

  // Computed values
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
  
  const isAuthenticated = useMemo(async () => {
    const api = await getBotAPI();
    const token = api.getToken();
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
