// ===============================
// FILE: src/context/AuthContext.js
// ===============================
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

// ===============================
// FILE: src/pages/AdminPanel.jsx
// ===============================
import React, {
  useEffect,
  useState,
  useCallback,
  Suspense,
  lazy,
  useMemo,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[AdminPanel] Tab "${this.props.tabName}" crashed:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mb-4 text-6xl animate-pulse">💥</div>
          <h3 className="mb-3 text-xl font-bold text-red-300">
            {this.props.tabName} failed to load
          </h3>
          <p className="mx-auto mb-6 max-w-md text-sm text-white/70">
            {this.state.error?.message || "An unexpected error occurred while loading this section."}
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium transition hover:bg-indigo-500"
          >
            Try Again ({this.state.retryCount})
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const TabLoader = ({ name }) => (
  <div className="flex min-h-[300px] flex-col items-center justify-center py-12">
    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    <p className="text-sm text-white/60">Loading {name}...</p>
  </div>
);

const DashboardOverview = lazy(() => import("../admin/DashboardOverview.jsx"));
const TokenManagement = lazy(() => import("../admin/TokenManagement.jsx"));
const FeeDistributor = lazy(() => import("../admin/FeeDistributor.jsx"));
const ReferralAnalytics = lazy(() => import("../admin/ReferralAnalytics.jsx"));
const SocialManager = lazy(() => import("../admin/SocialManager.jsx"));
const AccessControl = lazy(() => import("../admin/AccessControl.jsx"));
const UserManagement = lazy(() => import("../admin/UserManagement.jsx"));
const PromoManagement = lazy(() => import("../admin/PromoManagement.jsx"));
const WithdrawalManagement = lazy(() => import("../admin/WithdrawalManagement.jsx"));
const SystemHealth = lazy(() => import("../admin/SystemHealth.jsx"));
const AuditLogs = lazy(() => import("../admin/AuditLogs.jsx"));
const TreasuryManagement = lazy(() => import("../admin/TreasuryManagement.jsx"));
const MarketingAutomationTab = lazy(() => import("../admin/MarketingAutomation.jsx"));
const ReportsTab = lazy(() => import("../admin/ReportsTab.jsx"));
const TradesManagement = lazy(() => import("../admin/TradesManagement.jsx"));

const API_BASE = (process.env.REACT_APP_API_BASE_URL || "https://api.imali-defi.com").replace(/\/+$/, "");

const getAuthToken = () => {
  try {
    return localStorage.getItem("imali_token");
  } catch (e) {
    console.error("[AdminPanel] Failed to get token:", e);
    return null;
  }
};

const parseJsonSafely = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!text) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid JSON.");
    }
  }

  return { raw: text };
};

const buildErrorMessage = (status, payload, fallbackText) => {
  const payloadMessage =
    payload?.error ||
    payload?.message ||
    payload?.data?.error ||
    payload?.data?.message;

  if (payloadMessage) return payloadMessage;
  if (fallbackText) return fallbackText;
  if (status === 401) return "Authentication failed. Please log in again.";
  if (status === 403) return "You do not have permission to access this admin resource.";
  if (status === 429) return "Too many requests. Please wait and try again.";
  return `Request failed with status ${status}.`;
};

const isAuthError = (status, message = "") => {
  const msg = String(message || "").toLowerCase();
  return (
    status === 401 ||
    msg.includes("authentication failed") ||
    msg.includes("no authentication token") ||
    msg.includes("no token provided") ||
    msg.includes("invalid or expired token")
  );
};

const adminFetch = async (endpoint, options = {}, retries = 0) => {
  const token = getAuthToken();

  if (!token) {
    const err = new Error("No authentication token found");
    err.status = 401;
    throw err;
  }

  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${safeEndpoint}`;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        ...options,
        headers: {
          Accept: "application/json",
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      const payload = await parseJsonSafely(response);

      if (!response.ok) {
        const message = buildErrorMessage(response.status, payload, response.statusText);
        const err = new Error(message);
        err.status = response.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    } catch (error) {
      lastError = error;
      if (attempt < retries && !isAuthError(error?.status, error?.message)) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed");
};

const TAB_SECTIONS = [
  {
    id: "dashboard",
    name: "Dashboard",
    emoji: "📊",
    description: "See the health and activity of your platform.",
    tabs: [
      {
        key: "overview",
        label: "Overview",
        emoji: "✨",
        component: DashboardOverview,
        description: "Main numbers and summary cards.",
        help: "Start here to get a quick snapshot of platform performance.",
        actions: [{ id: "refresh", label: "Refresh Metrics", icon: "🔄", endpoint: "/api/admin/metrics", method: "GET" }],
      },
      {
        key: "health",
        label: "System Health",
        emoji: "🏥",
        component: SystemHealth,
        description: "Check if services are running correctly.",
        help: "Monitor backend services, database connectivity, and API health.",
        actions: [{ id: "refresh", label: "Check Health", icon: "🔄", endpoint: "/api/health/detailed", method: "GET" }],
      },
    ],
  },
  {
    id: "users",
    name: "Users",
    emoji: "👥",
    description: "Manage accounts and user data.",
    tabs: [
      {
        key: "users",
        label: "All Users",
        emoji: "👥",
        component: UserManagement,
        description: "View and manage user accounts.",
        help: "Search for users by email and manage accounts.",
        actions: [{ id: "refresh", label: "Refresh List", icon: "🔄", endpoint: "/api/admin/users?page=1&limit=50", method: "GET" }],
      },
    ],
  },
  {
    id: "trading",
    name: "Trading",
    emoji: "📈",
    description: "Monitor trading activity.",
    tabs: [
      {
        key: "trades",
        label: "All Trades",
        emoji: "📊",
        component: TradesManagement,
        description: "View all platform trades.",
        help: "See all trades across the platform.",
        actions: [{ id: "refresh", label: "Refresh Trades", icon: "🔄", endpoint: "/api/admin/trades?page=1&limit=50", method: "GET" }],
      },
      {
        key: "reports",
        label: "Reports",
        emoji: "📋",
        component: ReportsTab,
        description: "Generate trade and user reports.",
        help: "Generate detailed reports on trading activity.",
        actions: [
          { id: "trade-report", label: "Trade Report", icon: "📊", endpoint: "/api/admin/reports/trades", method: "GET" },
          { id: "user-report", label: "User Report", icon: "👥", endpoint: "/api/admin/reports/users", method: "GET" },
        ],
      },
    ],
  },
  {
    id: "money",
    name: "Money",
    emoji: "💰",
    description: "Handle payments and financial actions.",
    tabs: [
      {
        key: "withdrawals",
        label: "Withdrawals",
        emoji: "💰",
        component: WithdrawalManagement,
        description: "Approve or review withdrawal requests.",
        help: "Review pending withdrawal requests.",
        actions: [{ id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/withdrawals", method: "GET" }],
      },
      {
        key: "fees",
        label: "Fees",
        emoji: "💸",
        component: FeeDistributor,
        description: "Manage fee flows and distributions.",
        help: "View collected fees and distribution history.",
        actions: [{ id: "history", label: "Fee History", icon: "📜", endpoint: "/api/billing/fee-history", method: "GET" }],
      },
      {
        key: "treasury",
        label: "Treasury",
        emoji: "🏦",
        component: TreasuryManagement,
        description: "Manage platform-held funds.",
        help: "Monitor treasury balances across chains.",
        actions: [{ id: "stats", label: "Treasury Stats", icon: "📊", endpoint: "/api/admin/treasury/stats", method: "GET" }],
      },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    emoji: "📢",
    description: "Promote the platform and grow your audience.",
    tabs: [
      {
        key: "automation",
        label: "Auto Posts",
        emoji: "🤖",
        component: MarketingAutomationTab,
        description: "Schedule automated marketing posts.",
        help: "Create and manage automated posts to social channels.",
        actions: [{ id: "refresh", label: "Refresh Jobs", icon: "🔄", endpoint: "/api/admin/automation/jobs", method: "GET" }],
      },
      {
        key: "promos",
        label: "Promo Codes",
        emoji: "🎟️",
        component: PromoManagement,
        description: "Create and manage discount codes.",
        help: "Generate new promo codes with custom discounts.",
        actions: [{ id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/promo/list", method: "GET" }],
      },
      {
        key: "referrals",
        label: "Referrals",
        emoji: "🧲",
        component: ReferralAnalytics,
        description: "Track user invite performance.",
        help: "View top referrers and referral conversion rates.",
        actions: [{ id: "stats", label: "Referral Stats", icon: "📊", endpoint: "/api/admin/referrals/stats", method: "GET" }],
      },
      {
        key: "social",
        label: "Social Manager",
        emoji: "📱",
        component: SocialManager,
        description: "Manage social media activity.",
        help: "Connect and manage multiple social accounts.",
        actions: [{ id: "refresh", label: "Refresh", icon: "🔄", endpoint: "/api/admin/social/posts", method: "GET" }],
      },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    emoji: "⚙️",
    description: "Technical platform controls.",
    tabs: [
      {
        key: "token",
        label: "Token",
        emoji: "🪙",
        component: TokenManagement,
        description: "Mint, burn, and manage token actions.",
        help: "Control token supply.",
        actions: [{ id: "stats", label: "Token Stats", icon: "📊", endpoint: "/api/admin/token/stats", method: "GET" }],
      },
      {
        key: "audit",
        label: "Audit Logs",
        emoji: "📋",
        component: AuditLogs,
        description: "Review admin actions and events.",
        help: "See a chronological log of all admin actions.",
        actions: [{ id: "refresh", label: "Refresh Logs", icon: "🔄", endpoint: "/api/admin/audit-logs?limit=10", method: "GET" }],
      },
      {
        key: "access",
        label: "Permissions",
        emoji: "🔐",
        component: AccessControl,
        description: "Control admin access and roles.",
        help: "Manage which users have admin access.",
        actions: [{ id: "check", label: "Check Access", icon: "🔍", endpoint: "/api/admin/check", method: "GET" }],
      },
    ],
  },
];

const ALL_TABS = TAB_SECTIONS.flatMap((section) => section.tabs);

const SectionBadge = ({ emoji, name, description }) => (
  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 transition hover:border-white/20">
    <div className="mb-2 flex items-center gap-2">
      <span className="text-2xl">{emoji}</span>
      <h3 className="font-semibold">{name}</h3>
    </div>
    <p className="text-sm text-white/65">{description}</p>
  </div>
);

function SidebarButton({ tab, isActive, onClick, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={[
        "w-full rounded-xl border px-3 py-3 text-left transition-all duration-200",
        isActive
          ? "border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          : "border-transparent bg-transparent hover:border-white/10 hover:bg-white/5",
        busy ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      ].join(" ")}
      title={tab.description}
    >
      <div className="flex items-start gap-3">
        <span className="pt-0.5 text-xl">{tab.emoji}</span>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium">{tab.label}</span>
          <p className="mt-1 line-clamp-2 text-xs text-white/45">{tab.description}</p>
        </div>
      </div>
    </button>
  );
}

function ActionButton({ action, onAction, busy }) {
  return (
    <button
      onClick={() => onAction(action)}
      disabled={busy}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      ) : (
        <span>{action.icon}</span>
      )}
      <span>{action.label}</span>
    </button>
  );
}

export default function AdminPanel({ forceOwner = false }) {
  const { account } = useWallet();
  const { isAdmin: isAdminFromAuth, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState("overview");
  const [tabResetKey, setTabResetKey] = useState(0);
  const [busyAction, setBusyAction] = useState({});
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isDevelopment =
    process.env.NODE_ENV === "development" || window.location.hostname === "localhost";
  const BYPASS = isDevelopment && process.env.REACT_APP_BYPASS_OWNER === "1";
  const TEST_BYPASS = location.pathname.startsWith("/test/admin");
  const allowAccess = forceOwner || BYPASS || TEST_BYPASS || isAdminFromAuth;

  const activeTab = useMemo(() => {
    return ALL_TABS.find((tab) => tab.key === active) || ALL_TABS[0];
  }, [active]);

  const showToast = useCallback((message, type = "success", duration = 4000) => {
    setToast({ message, type });

    if (window.__imaliToastTimer) {
      window.clearTimeout(window.__imaliToastTimer);
    }

    window.__imaliToastTimer = window.setTimeout(() => setToast(null), duration);
  }, []);

  const logAction = useCallback((actionName, status, details = {}) => {
    setActionHistory((prev) => [
      {
        id: Date.now(),
        action: actionName,
        status,
        timestamp: new Date().toISOString(),
        details,
      },
      ...prev.slice(0, 49),
    ]);
  }, []);

  const resetCurrentTab = useCallback(() => setTabResetKey((prev) => prev + 1), []);

  const handleAuthFailure = useCallback(
    (message = "Session expired. Please log in again.") => {
      if (sessionExpired) return;
      setSessionExpired(true);
      setApiError(message);
      showToast(message, "error");

      window.setTimeout(() => {
        logout();
      }, 800);
    },
    [logout, sessionExpired, showToast]
  );

  const mapStats = useCallback((response) => {
    const data = response?.data || response || {};
    return {
      totalUsers: data.users?.total || 0,
      totalTrades: data.trades?.total || 0,
      totalPnl: Number(data.pnl?.total || 0),
      winRate: Number(data.trades?.win_rate || 0),
      pendingWithdrawals: Number(data.revenue?.pending_withdrawals || 0),
      openTickets: Number(data.tickets?.length || 0),
      activePromos: Number(data.promos?.length || 0),
      waitlistCount: Number(data.waitlist?.length || 0),
      activeJobs: Number(data.automation?.active_jobs || 0),
      totalRevenue: Number(data.revenue?.total_fees || 0),
      activeBots: Number(data.bots?.active || 0),
    };
  }, []);

  const fetchStats = useCallback(
    async (silent = false) => {
      if (sessionExpired) return null;

      try {
        if (!silent) setApiError(null);
        const response = await adminFetch("/api/admin/metrics", { method: "GET" });
        const normalizedStats = mapStats(response);
        setStats(normalizedStats);
        return normalizedStats;
      } catch (err) {
        const message = err?.message || "Failed to load metrics.";
        const status = err?.status || 0;

        if (isAuthError(status, message)) {
          handleAuthFailure(message);
          return null;
        }

        setApiError(message);
        if (!silent) showToast(`Failed to load metrics: ${message}`, "error");
        return null;
      }
    },
    [handleAuthFailure, mapStats, sessionExpired, showToast]
  );

  const handleAction = useCallback(
    async (action, payload = null, overrideEndpoint = null) => {
      const endpoint = overrideEndpoint || action?.endpoint;
      const method = action?.method || "GET";
      const actionKey = `${activeTab.key}:${action?.id || "custom"}`;
      const actionName = `${activeTab.label} ${action?.label || action?.id || "Action"}`;

      if (!endpoint) {
        const err = new Error("No endpoint defined for this action.");
        showToast(err.message, "error");
        throw err;
      }

      try {
        setBusyAction((prev) => ({ ...prev, [actionKey]: true }));
        logAction(actionName, "started", { endpoint, method, payload });

        const data = await adminFetch(endpoint, {
          method,
          ...(payload ? { body: JSON.stringify(payload) } : {}),
        });

        logAction(actionName, "success", { data });
        showToast(`${actionName} completed successfully.`, "success");

        if (action?.id === "refresh" || action?.id === "stats") {
          fetchStats(true);
        }

        return data;
      } catch (err) {
        const message = err?.message || `${actionName} failed.`;
        const status = err?.status || 0;

        logAction(actionName, "error", { error: message, status });

        if (isAuthError(status, message)) {
          handleAuthFailure(message);
        } else {
          setApiError(message);
          showToast(message, "error");
        }

        throw err;
      } finally {
        setBusyAction((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [activeTab, fetchStats, handleAuthFailure, logAction, showToast]
  );

  const navigateToTab = useCallback((tabKey) => {
    setActive(tabKey);
    setMobileMenuOpen(false);
    setTabResetKey(0);
  }, []);

  const renderTab = useCallback(
    (tab) => {
      const Component = tab.component;

      return (
        <TabErrorBoundary tabName={tab.label} onReset={resetCurrentTab}>
          <Suspense fallback={<TabLoader name={tab.label} />}>
            <Component
              key={`${tab.key}-${tabResetKey}`}
              apiBase={API_BASE}
              account={account}
              busyAction={busyAction}
              showToast={showToast}
              handleAction={handleAction}
              onAction={(actionConfig, payload) => handleAction(actionConfig, payload)}
              stats={stats}
              refreshStats={fetchStats}
              resetTab={resetCurrentTab}
              actionHistory={actionHistory}
            />
          </Suspense>
        </TabErrorBoundary>
      );
    },
    [
      account,
      actionHistory,
      busyAction,
      fetchStats,
      handleAction,
      resetCurrentTab,
      showToast,
      stats,
      tabResetKey,
    ]
  );

  useEffect(() => {
    if (authLoading || !allowAccess || sessionExpired) return;
    fetchStats(true);
  }, [authLoading, allowAccess, fetchStats, sessionExpired]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-4 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <h2 className="mb-2 text-xl font-semibold">Checking access...</h2>
          <p className="text-sm text-white/55">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (!allowAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-950 to-black px-6 text-white">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="mb-4 text-7xl">🔒</div>
          <h2 className="mb-2 text-2xl font-bold">Admin Only</h2>
          <p className="mb-6 text-white/65">You do not have admin access.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-medium transition hover:bg-emerald-500"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-950 to-black text-white">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[70] max-w-[92vw] rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${
            toast.type === "error"
              ? "border-red-500/40 bg-red-600/90"
              : "border-emerald-500/40 bg-emerald-600/90"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-sm opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      )}

      {apiError && (
        <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl border border-red-500/40 bg-red-600/90 p-4 shadow-lg backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-sm">⚠️ {apiError}</span>
            <button onClick={() => setApiError(null)} className="text-sm opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-white/10 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 transition hover:bg-white/10 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-xl font-bold text-transparent">
                IMALI Admin Panel
              </h1>
              <p className="hidden text-xs text-white/45 sm:block">
                Manage users, trades, finances, and platform settings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden items-center gap-2 lg:flex">
                <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs text-blue-300">
                  👥 {stats.totalUsers} users
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">
                  💰 ${Number(stats.totalPnl || 0).toFixed(2)}
                </span>
              </div>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-[88%] max-w-sm overflow-y-auto border-r border-white/10 bg-gray-950 px-4 pb-6 pt-20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Navigation</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {TAB_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{section.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{section.name}</h3>
                      <p className="text-xs text-white/45">{section.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {section.tabs.map((tab) => (
                      <SidebarButton
                        key={tab.key}
                        tab={tab}
                        isActive={active === tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        busy={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-[1600px]">
        <aside className="hidden min-h-[calc(100vh-65px)] w-[300px] shrink-0 border-r border-white/10 bg-white/[0.03] lg:block">
          <div className="sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto p-4">
            <div className="space-y-6">
              {TAB_SECTIONS.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">{section.emoji}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{section.name}</h3>
                      <p className="text-[11px] text-white/40">{section.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {section.tabs.map((tab) => (
                      <SidebarButton
                        key={tab.key}
                        tab={tab}
                        isActive={active === tab.key}
                        onClick={() => navigateToTab(tab.key)}
                        busy={false}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 lg:px-6 lg:py-6">
          {stats && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:hidden">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                <div className="text-lg font-bold text-blue-300">{stats.totalUsers}</div>
                <div className="text-xs text-white/50">Users</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center">
                <div className="text-lg font-bold text-emerald-300">
                  ${Number(stats.totalPnl || 0).toFixed(2)}
                </div>
                <div className="text-xs text-white/50">Total PnL</div>
              </div>
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-3 text-center">
                <div className="text-lg font-bold text-purple-300">{stats.winRate || 0}%</div>
                <div className="text-xs text-white/50">Win Rate</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                <div className="text-lg font-bold text-amber-300">{stats.totalTrades || 0}</div>
                <div className="text-xs text-white/50">Trades</div>
              </div>
            </div>
          )}

          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="text-4xl">{activeTab.emoji}</span>
                <div>
                  <h2 className="text-2xl font-bold">{activeTab.label}</h2>
                  <p className="mt-1 text-sm text-white/55">{activeTab.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={resetCurrentTab}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20"
                >
                  Reset Tab
                </button>
                <button
                  onClick={() => fetchStats()}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  Refresh All
                </button>
              </div>
            </div>
          </section>

          {activeTab.actions?.length > 0 && (
            <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeTab.actions.map((action) => (
                  <ActionButton
                    key={action.id}
                    action={action}
                    onAction={handleAction}
                    busy={busyAction[`${activeTab.key}:${action.id}`]}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            {renderTab(activeTab)}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❓</span>
                <h3 className="text-lg font-semibold">How to use this page</h3>
              </div>
              <button
                onClick={() => setShowHelpPanel((prev) => !prev)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs transition hover:bg-white/10"
              >
                {showHelpPanel ? "Hide help" : "Show help"}
              </button>
            </div>

            {showHelpPanel && (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-white/70">{activeTab.help}</p>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {TAB_SECTIONS.map((section) => (
                    <SectionBadge
                      key={section.id}
                      emoji={section.emoji}
                      name={section.name}
                      description={section.description}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="mt-6 text-center text-[11px] text-white/25">
            Admin Panel • {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "No wallet connected"} • Last updated: {new Date().toLocaleTimeString()}
          </div>
        </main>
      </div>
    </div>
  );
}
