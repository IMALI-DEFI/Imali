import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

const AuthContext = createContext(null);

const TOKEN_KEY = "imali_token";
const USER_KEY = "imali_user";
const ACTIVATION_KEY = "imali_activation";

const API_BASE_URL =
  (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const REFRESH_COOLDOWN_MS = 30_000;
const isBrowser = typeof window !== "undefined";

const safeStorageGet = (key) => {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[Auth] Failed to read localStorage key "${key}":`, err);
    return null;
  }
};

const safeStorageSet = (key, value) => {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[Auth] Failed to write localStorage key "${key}":`, err);
  }
};

const safeStorageRemove = (key) => {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[Auth] Failed to remove localStorage key "${key}":`, err);
  }
};

const getToken = () => safeStorageGet(TOKEN_KEY);

const setToken = (token) => {
  if (token) safeStorageSet(TOKEN_KEY, token);
  else safeStorageRemove(TOKEN_KEY);
};

const clearToken = () => safeStorageRemove(TOKEN_KEY);

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  if (typeof value === "number") return value === 1;
  return !!value;
};

const normalizeUser = (userData) => {
  if (!userData || (!userData.id && !userData.email)) return null;

  return {
    id: userData.id || null,
    email: userData.email || null,
    role: userData.role || null,
    tier: userData.tier || "starter",
    strategy: userData.strategy || "ai_weighted",
    trading_enabled: normalizeBoolean(userData.trading_enabled),
    is_admin: normalizeBoolean(userData.is_admin),
    isAdmin: normalizeBoolean(userData.isAdmin),
    has_card_on_file: normalizeBoolean(userData.has_card_on_file),
    billing_complete: normalizeBoolean(userData.billing_complete),
    referral_code: userData.referral_code || null,
    api_key: userData.api_key || null,
    wallet_addresses: Array.isArray(userData.wallet_addresses)
      ? userData.wallet_addresses
      : [],
    portfolio_value: Number(userData.portfolio_value || 1000),
    created_at: userData.created_at || null,
    updated_at: userData.updated_at || null,
  };
};

const normalizeActivation = (activationData) => {
  if (!activationData) return null;

  return {
    tier: activationData.tier || "starter",
    has_card_on_file: normalizeBoolean(activationData.has_card_on_file),
    billing_complete: normalizeBoolean(activationData.billing_complete),
    trading_enabled: normalizeBoolean(activationData.trading_enabled),
    wallet_connected: normalizeBoolean(activationData.wallet_connected),
    okx_connected: normalizeBoolean(activationData.okx_connected),
    alpaca_connected: normalizeBoolean(activationData.alpaca_connected),
    activation_complete: normalizeBoolean(activationData.activation_complete),
    tier_requirements_met: normalizeBoolean(activationData.tier_requirements_met),
    tier_required_integration:
      activationData.tier_required_integration || "Alpaca & OKX (both)",
  };
};

const defaultActivation = () => ({
  tier: "starter",
  has_card_on_file: false,
  billing_complete: false,
  trading_enabled: false,
  wallet_connected: false,
  okx_connected: false,
  alpaca_connected: false,
  activation_complete: false,
  tier_requirements_met: false,
  tier_required_integration: "Alpaca & OKX (both)",
});

const apiFetch = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const rawText = await response.text();

  let data = null;
  if (contentType.includes("application/json") && rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error(`Invalid JSON response from ${path}`);
    }
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      data?.data?.error ||
      data?.data?.message ||
      rawText ||
      `HTTP ${response.status} ${response.statusText}`;

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activation, setActivation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadAttemptedRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);

  const persistUser = useCallback((userData) => {
    const normalized = normalizeUser(userData);
    setUser(normalized);

    if (normalized) safeStorageSet(USER_KEY, JSON.stringify(normalized));
    else safeStorageRemove(USER_KEY);

    return normalized;
  }, []);

  const persistActivation = useCallback((activationData) => {
    const normalized = normalizeActivation(activationData);
    setActivation(normalized);

    if (normalized) safeStorageSet(ACTIVATION_KEY, JSON.stringify(normalized));
    else safeStorageRemove(ACTIVATION_KEY);

    return normalized;
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setActivation(null);
    setError(null);
    setRefreshing(false);
    clearToken();
    safeStorageRemove(USER_KEY);
    safeStorageRemove(ACTIVATION_KEY);
  }, []);

  const loadCachedState = useCallback(() => {
    try {
      const cachedUserRaw = safeStorageGet(USER_KEY);
      const cachedActivationRaw = safeStorageGet(ACTIVATION_KEY);

      if (cachedUserRaw) {
        const parsedUser = JSON.parse(cachedUserRaw);
        const normalizedUser = normalizeUser(parsedUser);
        if (normalizedUser) setUser(normalizedUser);
      }

      if (cachedActivationRaw) {
        const parsedActivation = JSON.parse(cachedActivationRaw);
        const normalizedActivation = normalizeActivation(parsedActivation);
        if (normalizedActivation) setActivation(normalizedActivation);
      }
    } catch (err) {
      console.warn("[Auth] Failed to load cached auth state:", err);
    }
  }, []);

  const refreshActivation = useCallback(
    async (force = false) => {
      const token = getToken();
      if (!token) {
        persistActivation(null);
        return null;
      }

      const now = Date.now();
      if (!force && now - lastRefreshTimeRef.current < REFRESH_COOLDOWN_MS) {
        return activation;
      }

      if (refreshing && !force) return activation;

      setRefreshing(true);
      lastRefreshTimeRef.current = now;

      try {
        const data = await apiFetch("/api/me/activation-status", { method: "GET" });
        const status = data?.data?.status || data?.status || data;
        return persistActivation(status || defaultActivation());
      } catch (err) {
        console.warn("[Auth] refreshActivation failed:", err.message);

        if (err.status === 401) {
          clearAuth();
          return null;
        }

        return activation || defaultActivation();
      } finally {
        setRefreshing(false);
      }
    },
    [activation, refreshing, persistActivation, clearAuth]
  );

  const loadUser = useCallback(
    async (skipCache = false) => {
      const token = getToken();

      if (!token) {
        clearAuth();
        setLoading(false);
        setIsInitialized(true);
        return null;
      }

      if (!skipCache && !user) loadCachedState();

      try {
        const data = await apiFetch("/api/me", { method: "GET" });
        const userData = data?.data?.user || data?.user || data?.data || data;
        const normalizedUser = persistUser(userData);

        if (!normalizedUser) {
          clearAuth();
          setLoading(false);
          setIsInitialized(true);
          return null;
        }

        setError(null);
        await refreshActivation(true);
        setLoading(false);
        setIsInitialized(true);
        return normalizedUser;
      } catch (err) {
        console.error("[Auth] loadUser failed:", err.message);

        if (err.status === 401) {
          clearAuth();
        } else {
          setError(err.message || "Failed to load user");
        }

        setLoading(false);
        setIsInitialized(true);
        return null;
      }
    },
    [user, loadCachedState, persistUser, refreshActivation, clearAuth]
  );

  const login = useCallback(
    async (email, password) => {
      setError(null);

      if (!email || !password) {
        const message = "Email and password are required";
        setError(message);
        return { success: false, error: message };
      }

      try {
        const data = await apiFetch("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const token = data?.data?.token || data?.token;
        const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

        if (!token) {
          const message = "Login succeeded but no token was returned";
          setError(message);
          return { success: false, error: message };
        }

        setToken(token);
        const loadedUser = await loadUser(true);

        if (!loadedUser) {
          const message = "Login succeeded but user profile could not be loaded";
          setError(message);
          return { success: false, error: message };
        }

        return { success: true, token, api_key: apiKey, user: loadedUser };
      } catch (err) {
        const message = err.message || "Login failed";
        setError(message);
        return { success: false, error: message };
      }
    },
    [loadUser]
  );

  const signup = useCallback(
    async (userData) => {
      setError(null);

      if (!userData?.email || !userData?.password) {
        const message = "Email and password are required";
        setError(message);
        return { success: false, error: message };
      }

      if (userData.password.length < 8) {
        const message = "Password must be at least 8 characters";
        setError(message);
        return { success: false, error: message };
      }

      try {
        const data = await apiFetch("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(userData),
        });

        const token = data?.data?.token || data?.token;
        const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;

        if (!token) {
          const message = "Signup succeeded but no token was returned";
          setError(message);
          return { success: false, error: message };
        }

        setToken(token);
        const loadedUser = await loadUser(true);

        if (!loadedUser) {
          const message = "Signup succeeded but user profile could not be loaded";
          setError(message);
          return { success: false, error: message };
        }

        return { success: true, token, api_key: apiKey, user: loadedUser };
      } catch (err) {
        const message = err.message || "Signup failed";
        setError(message);
        return { success: false, error: message };
      }
    },
    [loadUser]
  );

  const logout = useCallback(() => {
    clearAuth();
    if (isBrowser) window.location.href = "/login";
  }, [clearAuth]);

  const updateActivation = useCallback(
    async (updates) => {
      const nextActivation = {
        ...(activation || defaultActivation()),
        ...(updates || {}),
      };
      persistActivation(nextActivation);
      return refreshActivation(true);
    },
    [activation, persistActivation, refreshActivation]
  );

  useEffect(() => {
    if (!loadAttemptedRef.current) {
      loadAttemptedRef.current = true;
      loadCachedState();
      loadUser();
    }
  }, [loadCachedState, loadUser]);

  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;

    const intervalId = setInterval(() => {
      refreshActivation();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, refreshActivation]);

  const isAuthenticated = useMemo(() => !!getToken() && !!user, [user]);

  const activationComplete = useMemo(() => {
    return activation?.trading_enabled === true && activation?.activation_complete === true;
  }, [activation]);

  const hasCardOnFile = useMemo(() => {
    return activation?.has_card_on_file === true || activation?.billing_complete === true;
  }, [activation]);

  const hasRequiredIntegrations = useMemo(() => {
    if (!activation) return false;

    const tier = activation.tier || user?.tier || "starter";

    if (tier === "starter") return activation.alpaca_connected && activation.okx_connected;
    if (tier === "elite") return activation.wallet_connected;

    return activation.wallet_connected || activation.alpaca_connected || activation.okx_connected;
  }, [activation, user]);

  const isAdmin = useMemo(() => {
    const email = (user?.email || "").toLowerCase().trim();
    const role = (user?.role || "").toLowerCase().trim();
    const tier = (user?.tier || "").toLowerCase().trim();

    return (
      normalizeBoolean(user?.is_admin) ||
      normalizeBoolean(user?.isAdmin) ||
      role === "admin" ||
      role === "owner" ||
      role === "superadmin" ||
      tier === "admin" ||
      tier === "owner" ||
      email === "wayne@imali-defi.com"
    );
  }, [user]);

  const canTrade = useMemo(() => {
    return isAuthenticated && activationComplete && hasRequiredIntegrations;
  }, [isAuthenticated, activationComplete, hasRequiredIntegrations]);

  const isLoading = loading || (!isInitialized && loadAttemptedRef.current);

  const value = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
