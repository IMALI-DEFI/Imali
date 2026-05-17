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
const REDIRECT_KEY = "imali_redirect";

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

const VALID_TIERS = ["starter", "pro", "elite", "stock", "bundle", "enterprise"];

const normalizeUser = (userData) => {
  if (!userData || (!userData.id && !userData.email)) return null;

  const tier = userData.tier && VALID_TIERS.includes(userData.tier.toLowerCase()) 
    ? userData.tier.toLowerCase() 
    : "starter";

  return {
    id: userData.id || null,
    email: userData.email || null,
    role: userData.role || null,
    tier: tier,
    strategy: userData.strategy || "ai_weighted",
    trading_enabled: normalizeBoolean(userData.trading_enabled),
    paper_trading_enabled: normalizeBoolean(userData.paper_trading_enabled),
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
    organization_id: userData.organization_id || null,
    organization_role: userData.organization_role || null,
    custom_branding: userData.custom_branding || null,
    enhanced_bot_controls: normalizeBoolean(userData.enhanced_bot_controls),
    admin_panel_access: normalizeBoolean(userData.admin_panel_access),
    alpaca_connected: normalizeBoolean(userData.alpaca_connected),
    okx_connected: normalizeBoolean(userData.okx_connected),
    wallet_connected: normalizeBoolean(userData.wallet_connected),
  };
};

const normalizeActivation = (activationData) => {
  if (!activationData) return null;

  return {
    tier: activationData.tier && VALID_TIERS.includes(activationData.tier.toLowerCase()) 
      ? activationData.tier.toLowerCase() 
      : "starter",
    has_card_on_file: normalizeBoolean(activationData.has_card_on_file),
    billing_complete: normalizeBoolean(activationData.billing_complete),
    trading_enabled: normalizeBoolean(activationData.trading_enabled),
    paper_trading_enabled: normalizeBoolean(activationData.paper_trading_enabled),
    wallet_connected: normalizeBoolean(activationData.wallet_connected),
    okx_connected: normalizeBoolean(activationData.okx_connected),
    alpaca_connected: normalizeBoolean(activationData.alpaca_connected),
    activation_complete: normalizeBoolean(activationData.activation_complete),
    tier_requirements_met: normalizeBoolean(activationData.tier_requirements_met),
    tier_required_integration:
      activationData.tier_required_integration || "Alpaca & OKX (both)",
    enterprise_approved: normalizeBoolean(activationData.enterprise_approved),
    custom_strategy_access: normalizeBoolean(activationData.custom_strategy_access),
    admin_panel_enabled: normalizeBoolean(activationData.admin_panel_enabled),
  };
};

const defaultActivation = () => ({
  tier: "starter",
  has_card_on_file: false,
  billing_complete: false,
  trading_enabled: false,
  paper_trading_enabled: false,
  wallet_connected: false,
  okx_connected: false,
  alpaca_connected: false,
  activation_complete: false,
  tier_requirements_met: false,
  tier_required_integration: "Alpaca & OKX (both)",
  enterprise_approved: false,
  custom_strategy_access: false,
  admin_panel_enabled: false,
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
  const [intendedRedirect, setIntendedRedirect] = useState(null);

  const loadAttemptedRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  const refreshPromiseRef = useRef(null);

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
    setIntendedRedirect(null);
    clearToken();
    safeStorageRemove(USER_KEY);
    safeStorageRemove(ACTIVATION_KEY);
    safeStorageRemove(REDIRECT_KEY);
    refreshPromiseRef.current = null;
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

      if (refreshPromiseRef.current && !force) {
        console.log("[Auth] Using existing refresh promise");
        return refreshPromiseRef.current;
      }

      const now = Date.now();
      
      if (!force && now - lastRefreshTimeRef.current < REFRESH_COOLDOWN_MS) {
        console.log("[Auth] Using cached activation (cooldown active)");
        return activation;
      }

      refreshPromiseRef.current = (async () => {
        setRefreshing(true);
        lastRefreshTimeRef.current = now;

        try {
          console.log("[Auth] Fetching fresh activation status...");
          const data = await apiFetch("/api/me/activation-status", { method: "GET" });
          const status = data?.data?.status || data?.status || data;
          console.log("[Auth] Activation status received:", {
            okx_connected: status?.okx_connected,
            alpaca_connected: status?.alpaca_connected,
            wallet_connected: status?.wallet_connected,
            trading_enabled: status?.trading_enabled,
          });
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
          refreshPromiseRef.current = null;
        }
      })();

      return refreshPromiseRef.current;
    },
    [activation, persistActivation, clearAuth]
  );

  const getRedirectPath = useCallback((userData) => {
    // Check if user is enterprise
    if (userData?.tier === "enterprise" || userData?.organization_id) {
      return "/enterprise-dashboard";
    }
    
    // Check if user is admin
    if (userData?.is_admin === true || userData?.isAdmin === true) {
      return "/admin";
    }
    
    // Default to member dashboard
    return "/dashboard";
  }, []);

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
        
        // Check for stored redirect or compute default
        const storedRedirect = safeStorageGet(REDIRECT_KEY);
        if (storedRedirect) {
          safeStorageRemove(REDIRECT_KEY);
          window.location.href = storedRedirect;
        } else {
          // Auto-redirect enterprise users to correct dashboard
          const redirectPath = getRedirectPath(normalizedUser);
          const currentPath = window.location.pathname;
          
          // Don't redirect if already on the correct page or login/signup
          if (
            currentPath !== redirectPath && 
            !currentPath.includes('/login') && 
            !currentPath.includes('/signup') &&
            currentPath !== '/activation'
          ) {
            console.log(`[Auth] Auto-redirecting to ${redirectPath} based on user type`);
            window.location.href = redirectPath;
          }
        }
        
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
    [user, loadCachedState, persistUser, refreshActivation, clearAuth, getRedirectPath]
  );

  const login = useCallback(
    async (email, password, redirectPath = null) => {
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
        const userData = data?.data?.user || data?.user || null;

        if (!token) {
          const message = "Login succeeded but no token was returned";
          setError(message);
          return { success: false, error: message };
        }

        setToken(token);
        
        // Store intended redirect if provided
        if (redirectPath) {
          safeStorageSet(REDIRECT_KEY, redirectPath);
        }
        
        const normalizedUser = persistUser(userData);
        await refreshActivation(true);
        
        // Determine where to redirect
        const finalRedirect = redirectPath || getRedirectPath(normalizedUser);
        
        setLoading(false);
        setIsInitialized(true);
        
        console.log(`[Auth] Login successful, redirecting to ${finalRedirect}`);
        
        return { 
          success: true, 
          token, 
          api_key: apiKey, 
          user: normalizedUser,
          redirectTo: finalRedirect
        };
      } catch (err) {
        const message = err.message || "Login failed";
        setError(message);
        return { success: false, error: message };
      }
    },
    [loadUser, persistUser, refreshActivation, getRedirectPath]
  );

  const signup = useCallback(
    async (userData) => {
      setError(null);

      if (!userData?.email) {
        const message = "Email is required";
        setError(message);
        return { success: false, error: message };
      }

      const isEnterprise = userData.tier === "enterprise" || userData.mode === "enterprise";
      
      if (!isEnterprise) {
        if (!userData?.password) {
          const message = "Password is required";
          setError(message);
          return { success: false, error: message };
        }

        if (userData.password.length < 8) {
          const message = "Password must be at least 8 characters";
          setError(message);
          return { success: false, error: message };
        }

        if (userData.password.length > 72) {
          const message = "Password must be 72 characters or less";
          setError(message);
          return { success: false, error: message };
        }
      }

      if (!userData.accepted_terms && !userData.acceptTerms) {
        const message = "You must accept the Terms of Service";
        setError(message);
        return { success: false, error: message };
      }

      try {
        const payload = {
          email: userData.email,
          tier: userData.tier || "starter",
          strategy: userData.strategy || "ai_weighted",
          mode: userData.mode || "consumer",
          accepted_terms: true,
        };

        if (!isEnterprise && userData.password) {
          payload.password = userData.password;
        }

        if (userData.organizationName) {
          payload.organization_name = userData.organizationName;
        }
        if (userData.contactName) {
          payload.contact_name = userData.contactName;
        }
        if (userData.useCase) {
          payload.use_case = userData.useCase;
        }

        console.log("[Auth] Signup payload:", payload);

        const data = await apiFetch("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const token = data?.data?.token || data?.token;
        const apiKey = data?.data?.user?.api_key || data?.user?.api_key || null;
        const userFromResponse = data?.data?.user || data?.user || null;

        if (!token && !isEnterprise) {
          const message = "Signup succeeded but no token was returned";
          setError(message);
          return { success: false, error: message };
        }

        if (token) {
          setToken(token);
          
          const normalizedUser = persistUser(userFromResponse);
          await refreshActivation(true);
          
          // Auto-redirect enterprise users to correct dashboard
          const redirectPath = getRedirectPath(normalizedUser);
          
          setLoading(false);
          setIsInitialized(true);
          
          return { 
            success: true, 
            token, 
            api_key: apiKey, 
            user: normalizedUser,
            redirectTo: redirectPath
          };
        }

        return { 
          success: true, 
          requiresApproval: true,
          message: "Enterprise signup request received. Our sales team will contact you shortly."
        };
      } catch (err) {
        const message = err.message || "Signup failed";
        setError(message);
        return { success: false, error: message };
      }
    },
    [persistUser, refreshActivation, getRedirectPath]
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

  // Enterprise-specific API calls
  const getOrganizationDetails = useCallback(async () => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/organizations/${user.organization_id}`, {
        method: "GET",
      });
      return { success: true, organization: data?.data };
    } catch (err) {
      console.error("[Auth] Failed to get organization details:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const getOrganizationUsers = useCallback(async () => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/organizations/${user.organization_id}/users`, {
        method: "GET",
      });
      return { success: true, users: data?.data?.users || [] };
    } catch (err) {
      console.error("[Auth] Failed to get organization users:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const inviteTeamMember = useCallback(async (email, role) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/organizations/${user.organization_id}/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      return { success: true, invitation: data?.data };
    } catch (err) {
      console.error("[Auth] Failed to invite team member:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const removeTeamMember = useCallback(async (userId) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/organizations/${user.organization_id}/users/${userId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (err) {
      console.error("[Auth] Failed to remove team member:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const updateTeamMemberRole = useCallback(async (userId, role) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/organizations/${user.organization_id}/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role }),
      });
      return { success: true };
    } catch (err) {
      console.error("[Auth] Failed to update team member role:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const getCustomStrategies = useCallback(async () => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/strategies`, {
        method: "GET",
      });
      return { success: true, strategies: data?.data?.strategies || [] };
    } catch (err) {
      console.error("[Auth] Failed to get custom strategies:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const createCustomStrategy = useCallback(async (name, description, strategyConfig) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/strategies`, {
        method: "POST",
        body: JSON.stringify({ name, description, strategy_config: strategyConfig }),
      });
      return { success: true, strategy: data?.data?.strategy };
    } catch (err) {
      console.error("[Auth] Failed to create custom strategy:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const updateCustomStrategy = useCallback(async (strategyId, updates) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/strategies/${strategyId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      return { success: true };
    } catch (err) {
      console.error("[Auth] Failed to update custom strategy:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const deleteCustomStrategy = useCallback(async (strategyId) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/strategies/${strategyId}`, {
        method: "DELETE",
      });
      return { success: true };
    } catch (err) {
      console.error("[Auth] Failed to delete custom strategy:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const getEnterpriseAnalytics = useCallback(async (days = 30) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/analytics?days=${days}`, {
        method: "GET",
      });
      return { success: true, analytics: data?.data };
    } catch (err) {
      console.error("[Auth] Failed to get enterprise analytics:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

  const getAuditLogs = useCallback(async (limit = 50, offset = 0) => {
    if (!user?.organization_id || user?.tier !== "enterprise") {
      return { success: false, error: "Not an enterprise user" };
    }

    try {
      const data = await apiFetch(`/api/enterprise/audit-logs?limit=${limit}&offset=${offset}`, {
        method: "GET",
      });
      return { success: true, logs: data?.data?.logs || [], total: data?.data?.total || 0 };
    } catch (err) {
      console.error("[Auth] Failed to get audit logs:", err);
      return { success: false, error: err.message };
    }
  }, [user]);

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
      refreshActivation(false);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user, refreshActivation]);

  const isAuthenticated = useMemo(() => !!getToken() && !!user, [user]);
  
  const isEnterpriseUser = useMemo(() => {
    return user?.tier === "enterprise" || !!user?.organization_id;
  }, [user]);

  const isEnterpriseAdmin = useMemo(() => {
    return isEnterpriseUser && (
      user?.organization_role === "admin" ||
      user?.organization_role === "owner" ||
      user?.is_admin === true ||
      user?.isAdmin === true
    );
  }, [isEnterpriseUser, user]);

  const hasEnhancedBotControls = useMemo(() => {
    return isEnterpriseUser && user?.enhanced_bot_controls === true;
  }, [isEnterpriseUser, user]);

  const hasAdminPanelAccess = useMemo(() => {
    return isEnterpriseAdmin && user?.admin_panel_access === true;
  }, [isEnterpriseAdmin, user]);

  const activationComplete = useMemo(() => {
    if (isEnterpriseUser) {
      return activation?.enterprise_approved === true && 
             activation?.trading_enabled === true;
    }
    return activation?.trading_enabled === true && activation?.activation_complete === true;
  }, [activation, isEnterpriseUser]);

  const hasCardOnFile = useMemo(() => {
    if (isEnterpriseUser) return true;
    return activation?.has_card_on_file === true || activation?.billing_complete === true;
  }, [activation, isEnterpriseUser]);

  const hasRequiredIntegrations = useMemo(() => {
    if (!activation) return false;
    
    if (isEnterpriseUser) {
      return true;
    }

    const tier = activation.tier || user?.tier || "starter";

    if (tier === "starter") return activation.alpaca_connected && activation.okx_connected;
    if (tier === "elite") return activation.wallet_connected;

    return activation.wallet_connected || activation.alpaca_connected || activation.okx_connected;
  }, [activation, user, isEnterpriseUser]);

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
      isEnterpriseUser,
      isEnterpriseAdmin,
      hasEnhancedBotControls,
      hasAdminPanelAccess,
      signup,
      login,
      logout,
      loadUser,
      refreshActivation,
      updateActivation,
      clearAuth,
      getApiKey: () => user?.api_key || null,
      // Enterprise methods
      getOrganizationDetails,
      getOrganizationUsers,
      inviteTeamMember,
      removeTeamMember,
      updateTeamMemberRole,
      getCustomStrategies,
      createCustomStrategy,
      updateCustomStrategy,
      deleteCustomStrategy,
      getEnterpriseAnalytics,
      getAuditLogs,
      getRedirectPath: () => getRedirectPath(user),
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
      isEnterpriseUser,
      isEnterpriseAdmin,
      hasEnhancedBotControls,
      hasAdminPanelAccess,
      signup,
      login,
      logout,
      loadUser,
      refreshActivation,
      updateActivation,
      clearAuth,
      getOrganizationDetails,
      getOrganizationUsers,
      inviteTeamMember,
      removeTeamMember,
      updateTeamMemberRole,
      getCustomStrategies,
      createCustomStrategy,
      updateCustomStrategy,
      deleteCustomStrategy,
      getEnterpriseAnalytics,
      getAuditLogs,
      getRedirectPath,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
